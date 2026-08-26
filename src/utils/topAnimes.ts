/**
 * O Top Animes não devolve um player, e sim uma página que embrulha o vídeo, e
 * cada episódio pode vir num formato diferente. Há cinco no ar hoje.
 *
 * Dois escondem a playlist e só o servidor consegue chegar nela, então passam
 * pelo /api/stream:
 *
 * - `/antivirus…`: checa o `document.referrer` e, fora do domínio deles, troca
 *   o próprio endereço pela home — era o que engolia o vídeo no nosso iframe;
 * - `sk-api.alibabacdn.net`: busca as fontes com `mode=api2`, de uma origem que
 *   não libera CORS para nós.
 */
const WRAPPED_PLAYERS = ["topanimes.net/antivirus", "sk-api.alibabacdn.net"];

/**
 * Outros dois carregam o endereço real no próprio link, então basta abrir o
 * embrulho: `/aviso/?url=` é uma sala de espera na frente de um player de
 * terceiros, e `videohls.php?d=` é uma tela de anúncios na frente de um m3u8.
 */
const WRAPPER_PARAMS: Record<string, string> = {
  "topanimes.net/aviso": "url",
  "anivideo.net/videohls": "d",
};

/** E o quinto avisa que aquele player caiu, sem vídeo nenhum atrás. */
const OFFLINE_PLAYER = "topanimes.net/off";

export const isWrappedPlayer = (url: string) =>
  WRAPPED_PLAYERS.some((wrapper) => url.includes(wrapper));

export const isOfflinePlayer = (url: string) => url.includes(OFFLINE_PLAYER);

export const unwrapPlayer = (url: string) => {
  const wrapper = Object.keys(WRAPPER_PARAMS).find((key) => url.includes(key));
  if (!wrapper) return url;

  try {
    return new URL(url).searchParams.get(WRAPPER_PARAMS[wrapper]) ?? url;
  } catch {
    return url;
  }
};

/**
 * A página do episódio costuma ter mais de um player — quando o primeiro cai, o
 * aviso deles mesmo manda usar o seguinte —, mas a API só nos conta o primeiro.
 * Aqui a gente lê a página e recupera a lista inteira, com os nomes que ela dá
 * a cada um.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const PAGE_TIMEOUT = 10_000;

/** Cada player vive numa caixa `source-player-N`, com o embed dentro. */
const PLAYER_BOX = /<div id=['"]source-player-([^'"]+)['"][^>]*>([\s\S]*?)<\/div>/g;

/** E ganha um nome na lista de opções, ligado à caixa pelo `data-nume`. */
const PLAYER_LABEL =
  /data-nume=['"]([^'"]+)['"][^>]*>\s*<span[^>]*>([^<]*)<\/span>/g;

const EMBED_SRC = /(?:data-)?src=['"]([^'"]+)['"]/;

export interface TopAnimesPlayer {
  label: string | null;
  url: string;
}

export const listEpisodePlayers = async (
  episodePage: string
): Promise<TopAnimesPlayer[]> => {
  const response = await fetch(episodePage, {
    cache: "no-store",
    signal: AbortSignal.timeout(PAGE_TIMEOUT),
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!response.ok) return [];

  const html = await response.text();

  const labels = new Map(
    Array.from(html.matchAll(PLAYER_LABEL), (match) => [
      match[1],
      match[2].trim(),
    ])
  );

  return Array.from(html.matchAll(PLAYER_BOX))
    .map(([, nume, box]) => ({
      label: labels.get(nume) || null,
      url: EMBED_SRC.exec(box)?.[1] ?? "",
    }))
    .filter(({ url }) => !!url && !isOfflinePlayer(url));
};
