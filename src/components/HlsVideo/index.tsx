"use client";

import { CSSProperties, useEffect, useRef } from "react";

/**
 * Toca uma playlist HLS pelo hls.js, baixado só quando um player desses entra
 * em cena. O caminho nativo do Safari fica como último recurso porque os
 * segmentos do Top Animes vêm disfarçados de PNG — o TS de verdade começa uns
 * bytes adiante, e só o hls.js procura o início real do stream.
 */
const HlsVideo = ({
  src,
  style,
  onError,
}: {
  src: string;
  style?: CSSProperties;
  onError: () => void;
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

  return <video ref={videoRef} controls autoPlay style={style} />;
};

export default HlsVideo;
