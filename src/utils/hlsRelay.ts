/** CDNs cujo HLS só toca aqui passando pelo /api/hls (não liberam CORS). */
const RELAY_HOSTS = [/(^|\.)akumast\.net$/];

/**
 * O endereço, se for de um CDN que o /api/hls repassa. Qualquer outro fica de
 * fora, para o handler não virar proxy aberto.
 */
export const parseRelaySource = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      RELAY_HOSTS.some((host) => host.test(url.hostname))
      ? url
      : null;
  } catch {
    return null;
  }
};

export const isRelayedHls = (url: string) => !!parseRelaySource(url);

export const relayUrl = (url: string | URL) =>
  `/api/hls?src=${encodeURIComponent(url.toString())}`;
