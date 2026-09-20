import { createCache } from "@/utils/cache";
import { NextResponse } from "next/server";
import {
  AnistreamConfig,
  anistreamConfig,
  encodeStreamSrc,
  jellyfinJson,
  resolveCredentials,
} from "@/utils/anistream";

/**
 * Resolve o player do AniStream para um episódio. O AniStream é um Jellyfin:
 * a série é um item, o episódio é outro, e o playback vem de um PlaybackInfo
 * que devolve a URL de transcode (HLS). Tudo aqui roda no servidor porque
 * depende do token da conta, que não pode chegar ao browser.
 *
 * O cliente manda os títulos conhecidos do anime (?title=...&title=...) e o
 * número do episódio; a gente procura a série por cada título até uma existir
 * na biblioteca.
 */

// A conversa são vários saltos (login, busca, episódios, PlaybackInfo) num
// servidor de terceiros; vale um teto generoso.
const REQUEST_TIMEOUT = 20_000;

/**
 * O mesmo episódio é reaberto o tempo todo (ir e voltar entre episódios). A URL
 * de transcode carrega um PlaySessionId e um token de sessão que duram horas,
 * então dez minutos de cache cortam a repetição sem servir link vencido.
 */
const PLAYER_TTL = 10 * 60 * 1000;

interface EpisodeResult {
  providers: EpisodeProviderProps[];
}

const playerCache = createCache<EpisodeResult>({
  namespace: "anistream-player",
  ttl: PLAYER_TTL,
  maxEntries: 200,
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = anistreamConfig();
  // Sem credenciais o provider fica desligado, sem estourar erro na tela.
  if (!config) return NextResponse.json({ providers: [] });

  const url = new URL(request.url);
  const titles = url.searchParams.getAll("title").filter(Boolean);
  const episode = Number(url.searchParams.get("episode"));
  if (!titles.length || !Number.isFinite(episode) || episode < 1) {
    return NextResponse.json({ providers: [] });
  }

  const result = await playerCache.resolve(
    `${episode}/${titles.join("|")}`,
    () => resolveEpisode(config, titles, episode),
    // Uma resposta vazia costuma ser a obra fora do catálogo ou a busca
    // instável — não vale congelar por dez minutos.
    { shouldStore: ({ providers }) => providers.length > 0 }
  );

  return NextResponse.json(result);
}

const resolveEpisode = async (
  config: AnistreamConfig,
  titles: string[],
  episodeNumber: number
): Promise<EpisodeResult> => {
  try {
    // O login também é de onde sai o userId, exigido em toda chamada do Jellyfin.
    const creds = await resolveCredentials(config, REQUEST_TIMEOUT);
    if (!creds) return { providers: [] };

    for (const title of titles) {
      const seriesId = await findSeries(config, creds.userId, title);
      if (!seriesId) continue;

      const itemId = await findEpisodeItem(
        config,
        creds.userId,
        seriesId,
        episodeNumber
      );
      if (!itemId) continue;

      const provider = await buildProvider(config, creds.userId, itemId);
      if (provider) return { providers: [provider] };
    }

    return { providers: [] };
  } catch (err) {
    return { providers: [] };
  }
};

/** Normaliza um título para comparar nomes sem esbarrar em acento/pontuação. */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Termo enviado à busca do Jellyfin. O "×" (sinal de multiplicação, comum em
 * títulos como "HUNTER×HUNTER") não retorna nada; viramos ele num "x", e ainda
 * tiramos o "(ano)" do fim, que também atrapalha a busca.
 */
const searchTerm = (title: string) =>
  title
    .replace(/[×✕]/g, "x")
    .replace(/\(\s*\d{4}\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

interface JellyfinItem {
  Id: string;
  Name?: string;
  IndexNumber?: number;
}

/**
 * Procura a série pelo título. A busca do Jellyfin é ampla, então a gente
 * confirma o resultado comparando o nome normalizado — evita casar "Re:Zero"
 * com um spin-off que só compartilha uma palavra.
 */
const findSeries = async (
  config: AnistreamConfig,
  userId: string,
  title: string
): Promise<string | null> => {
  const data = await jellyfinJson<{ Items?: JellyfinItem[] }>(
    config,
    "/Items",
    {
      userId,
      // A busca do Jellyfin engasga com o "×" (ex.: "HUNTER×HUNTER" não
      // retorna nada) e com o "(ano)" no fim; o termo limpo casa a série.
      searchTerm: searchTerm(title),
      IncludeItemTypes: "Series",
      Recursive: "true",
      Limit: "8",
    },
    REQUEST_TIMEOUT
  );

  const items = data?.Items ?? [];
  const wanted = normalize(title);

  const exact = items.find((item) => normalize(item.Name ?? "") === wanted);
  if (exact) return exact.Id;

  // Sem correspondência exata, aceita o primeiro cujo nome contenha o título
  // (ou vice-versa): pega "Re:Zero – Starting Life…" a partir de "Re:Zero".
  const partial = items.find((item) => {
    const name = normalize(item.Name ?? "");
    return name.includes(wanted) || wanted.includes(name);
  });
  return partial?.Id ?? null;
};

/**
 * Acha o item do episódio pela numeração absoluta. A biblioteca do AniStream
 * guarda a franquia inteira sob uma só "Temporada 1", numerada de ponta a
 * ponta, então o número do episódio bate direto com o IndexNumber.
 */
const findEpisodeItem = async (
  config: AnistreamConfig,
  userId: string,
  seriesId: string,
  episodeNumber: number
): Promise<string | null> => {
  const data = await jellyfinJson<{ Items?: JellyfinItem[] }>(
    config,
    `/Shows/${seriesId}/Episodes`,
    { userId, Fields: "" },
    REQUEST_TIMEOUT
  );

  const match = (data?.Items ?? []).find(
    (item) => item.IndexNumber === episodeNumber
  );
  return match?.Id ?? null;
};

interface MediaStream {
  Type?: string;
  Index?: number;
  Codec?: string;
  Language?: string;
  DisplayTitle?: string;
  IsTextSubtitleStream?: boolean;
  DeliveryMethod?: string;
  DeliveryUrl?: string | null;
  IsDefault?: boolean;
}

interface MediaSource {
  TranscodingUrl?: string | null;
  SupportsDirectStream?: boolean;
  Id?: string;
  Container?: string;
  MediaStreams?: MediaStream[];
}

/**
 * Perfil que anunciamos ao Jellyfin no PlaybackInfo. Ele não muda o que o
 * <video> aceita — muda o que o Jellyfin decide entregar: como só declaramos
 * DirectPlay para mp4 e um transcode HLS de h264/aac, o servidor recusa o
 * container original (mkv, que browser nenhum toca) e devolve uma master.m3u8.
 *
 * Como o vídeo do AniStream já é h264/aac, esse "transcode" costuma ser só um
 * remux (copia as streams para segmentos TS) — barato e rápido. As legendas
 * ficam de fora de propósito: queimá-las forçaria re-encode do vídeo, e o
 * próprio site as entrega como faixa externa, não gravadas na imagem.
 */
const DEVICE_PROFILE = {
  MaxStreamingBitrate: 120_000_000,
  DirectPlayProfiles: [
    { Container: "mp4,m4v", Type: "Video", VideoCodec: "h264", AudioCodec: "aac,mp3" },
  ],
  TranscodingProfiles: [
    {
      Container: "ts",
      Type: "Video",
      VideoCodec: "h264",
      AudioCodec: "aac",
      Protocol: "hls",
      Context: "Streaming",
      MaxAudioChannels: "2",
      MinSegments: 1,
      BreakOnNonKeyFrames: true,
    },
  ],
  CodecProfiles: [],
  SubtitleProfiles: [{ Format: "vtt", Method: "External" }],
};

/**
 * Pede o PlaybackInfo do episódio e transforma a fonte num player HLS. O POST
 * leva o DeviceProfile: sem ele, o Jellyfin acha que o cliente toca o mkv cru
 * e não gera a playlist. Com ele, vem a master.m3u8 pronta na TranscodingUrl.
 */
const buildProvider = async (
  config: AnistreamConfig,
  userId: string,
  itemId: string
): Promise<EpisodeProviderProps | null> => {
  const data = await jellyfinJson<{ MediaSources?: MediaSource[] }>(
    config,
    `/Items/${itemId}/PlaybackInfo`,
    {
      UserId: userId,
      MediaSourceId: itemId,
      StartTimeTicks: "0",
      IsPlayback: "true",
      AutoOpenLiveStream: "true",
    },
    REQUEST_TIMEOUT,
    { method: "POST", json: { DeviceProfile: DEVICE_PROFILE } }
  );

  const source = (data?.MediaSources ?? [])[0];
  if (!source) return null;

  // A TranscodingUrl vem relativa ("/videos/…/master.m3u8?…"). Só cai no stream
  // estático quando o próprio item já é um container que o browser toca (mp4);
  // com mkv, o perfil garante que a TranscodingUrl venha preenchida.
  const rawPath =
    source.TranscodingUrl ||
    (source.SupportsDirectStream && source.Id && isBrowserContainer(source.Container)
      ? `/Videos/${itemId}/stream?static=true&mediaSourceId=${source.Id}&container=${source.Container}`
      : null);
  if (!rawPath) return null;

  return {
    name: "AniStream",
    slug: "anistream",
    hasAds: false,
    isEmbed: false,
    isHls: rawPath.includes(".m3u8"),
    // O src vai codificado: o proxy reconstrói a URL e injeta o token, que
    // assim nunca aparece no que o browser recebe.
    url: `/api/anistream/stream?src=${encodeStreamSrc(rawPath)}`,
    subtitles: buildSubtitles(source.MediaStreams ?? []),
  };
};

/** Containers que um <video> reproduz sem transcode. */
const isBrowserContainer = (container?: string): boolean =>
  !!container && /^(mp4|m4v|webm|mov)$/i.test(container);

/**
 * Idiomas de legenda que oferecemos, na ordem de preferência, com o rótulo e o
 * srclang de cada um. Português vem primeiro e já entra ligado.
 */
const SUBTITLE_LANGS: { code: string; lang: string; label: string }[] = [
  { code: "por", lang: "pt", label: "Português" },
  { code: "eng", lang: "en", label: "Inglês" },
  { code: "spa", lang: "es", label: "Espanhol" },
];

/**
 * Monta as faixas de legenda a partir das MediaStreams. Como a conta não pode
 * queimar legenda no vídeo, cada uma é entregue à parte em WebVTT: pegamos a
 * DeliveryUrl que o próprio Jellyfin indica e trocamos a extensão por .vtt,
 * que ele converte na hora. Tudo passa pelo proxy, que injeta o token.
 */
const buildSubtitles = (streams: MediaStream[]): SubtitleTrackProps[] => {
  const subs: SubtitleTrackProps[] = [];

  for (const { code, lang, label } of SUBTITLE_LANGS) {
    // Prefere SRT (subrip) por converter mais limpo para VTT; depois ASS.
    const candidates = streams.filter(
      (s) =>
        s.Type === "Subtitle" &&
        s.IsTextSubtitleStream &&
        s.Language === code &&
        s.DeliveryUrl
    );
    const chosen =
      candidates.find((s) => s.Codec === "subrip") ?? candidates[0];
    if (!chosen?.DeliveryUrl) continue;

    // A DeliveryUrl vem como .../Stream.ass ou .../Stream.subrip; .vtt pede a
    // conversão. O encodeStreamSrc ainda tira o ApiKey embutido.
    const vttPath = chosen.DeliveryUrl.replace(
      /Stream\.[a-z0-9]+(\?|$)/i,
      "Stream.vtt$1"
    );

    subs.push({
      url: `/api/anistream/stream?src=${encodeStreamSrc(vttPath)}`,
      lang,
      label,
      isDefault: subs.length === 0,
    });
  }

  return subs;
};
