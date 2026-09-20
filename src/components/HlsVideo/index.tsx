"use client";

import { CSSProperties, useEffect, useRef } from "react";

/**
 * Toca uma playlist HLS pelo hls.js, baixado só quando um player desses entra
 * em cena. O caminho nativo do Safari fica como último recurso porque os
 * segmentos do Top Animes vêm disfarçados de PNG — o TS de verdade começa uns
 * bytes adiante, e só o hls.js procura o início real do stream.
 *
 * As legendas, quando o provider as entrega, vêm como faixas <track> externas
 * (WebVTT). É assim que o AniStream serve legenda: a conta não pode queimá-la
 * no vídeo, então ela é uma faixa à parte, renderizada pelo próprio <video>.
 */
const HlsVideo = ({
  src,
  style,
  onError,
  subtitles,
}: {
  src: string;
  style?: CSSProperties;
  onError: () => void;
  subtitles?: SubtitleTrackProps[];
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guardado em ref para o player não ser remontado a cada render do pai.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let player: { destroy: () => void } | null = null;
    let cancelled = false;

    // O import dinâmico mantém o hls.js fora do bundle de quem não usa HLS.
    import("hls.js").then(({ default: Hls }) => {
      // O episódio pode ter trocado enquanto o hls.js carregava.
      if (cancelled) return;

      if (!Hls.isSupported()) {
        // Sem Media Source Extensions só resta o player nativo.
        if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = src;
        else onErrorRef.current();
        return;
      }

      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      // Erros não fatais o próprio hls.js recupera sozinho.
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) onErrorRef.current();
      });

      player = hls;
    });

    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, [src]);

  /**
   * O atributo `default` do <track> nem sempre basta para o browser já mostrar
   * a legenda, então forçamos o modo assim que as faixas existem. A escolhida é
   * a marcada como padrão (Português); as outras ficam disponíveis no menu.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !subtitles?.length) return;

    const defaultLabel = subtitles.find((track) => track.isDefault)?.label;

    const applyMode = () => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = tracks[i].label === defaultLabel ? "showing" : "disabled";
      }
    };

    applyMode();
    video.addEventListener("loadedmetadata", applyMode);
    return () => video.removeEventListener("loadedmetadata", applyMode);
  }, [subtitles]);

  return (
    <video ref={videoRef} controls autoPlay style={style}>
      {subtitles?.map((track) => (
        <track
          key={track.url}
          kind="subtitles"
          src={track.url}
          srcLang={track.lang}
          label={track.label}
          default={track.isDefault}
        />
      ))}
    </video>
  );
};

export default HlsVideo;
