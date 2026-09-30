/**
 * Download de capítulos em PDF ou CBZ, montado no próprio browser a partir
 * das páginas do MangaDex@Home.
 *
 * O jsPDF e o JSZip entram por `import()`: juntos passam de 300 kB, e só quem
 * clica em baixar precisa deles.
 */

export type ChapterDownloadFormat = "pdf" | "cbz";

export interface ChapterDownloadInfo {
  series: string;
  chapter: MangaChapterProps;
  version: MangaChapterVersionProps;
  language: MangaLanguage;
  pages: string[];
}

interface DownloadOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

/** Páginas baixadas ao mesmo tempo: rápido sem martelar o servidor do @Home. */
const CONCURRENCY = 3;

/** Largura em pontos de PDF de um pixel a 96 dpi. */
const PX_TO_PT = 72 / 96;

const JPEG_QUALITY = 0.92;

/**
 * Os servidores do MangaDex@Home costumam liberar CORS para qualquer origem;
 * quando um nó não libera, a página vem pelo nosso proxy.
 */
const fetchPage = async (url: string, signal?: AbortSignal) => {
  try {
    const res = await fetch(url, { mode: "cors", signal });
    if (res.ok) return await res.blob();
  } catch (err) {
    if (signal?.aborted) throw err;
  }

  const res = await fetch(`/api/mangadex/image?url=${encodeURIComponent(url)}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Não foi possível baixar ${url}`);
  return res.blob();
};

/** Baixa todas as páginas mantendo a ordem, com concorrência limitada. */
const fetchPages = async (
  urls: string[],
  { onProgress, signal }: DownloadOptions
) => {
  const blobs: Blob[] = new Array(urls.length);
  let next = 0;
  let done = 0;
  onProgress?.(0, urls.length);

  const worker = async () => {
    while (next < urls.length) {
      const index = next++;
      blobs[index] = await fetchPage(urls[index], signal);
      done += 1;
      onProgress?.(done, urls.length);
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  return blobs;
};

/**
 * O jsPDF embute JPEG sem recodificar; PNG, WebP e GIF passam por um canvas
 * e viram JPEG — o PNG embutido direto seria decodificado em JavaScript,
 * lento e com arquivo bem maior no fim.
 */
const toJpeg = async (blob: Blob) => {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  if (blob.type === "image/jpeg") {
    bitmap.close();
    return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  // Fundo branco: a transparência de um PNG viraria preto no JPEG.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Falha ao converter a página"))),
      "image/jpeg",
      JPEG_QUALITY
    )
  );
  return { data: new Uint8Array(await jpeg.arrayBuffer()), width, height };
};

const buildPdf = async (blobs: Blob[], info: ChapterDownloadInfo) => {
  const { jsPDF } = await import("jspdf");
  let doc: InstanceType<typeof jsPDF> | null = null;

  for (const blob of blobs) {
    const { data, width, height } = await toJpeg(blob);
    // Cada página do PDF tem o tamanho da própria imagem: páginas duplas
    // saem deitadas, sem margem nem corte.
    const size = [width * PX_TO_PT, height * PX_TO_PT];
    const orientation = width > height ? "l" : "p";

    if (!doc) {
      doc = new jsPDF({ unit: "pt", format: size, orientation, compress: true });
    } else {
      doc.addPage(size, orientation);
    }
    doc.addImage(data, "JPEG", 0, 0, size[0], size[1], undefined, "NONE");
  }

  doc!.setProperties({
    title: `${info.series} - ${chapterTitle(info.chapter)}`,
    subject: info.version.group ? `Tradução: ${info.version.group}` : "",
    creator: "Anime Complex (via MangaDex)",
  });
  return doc!.output("blob");
};

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);

/** Metadados que leitores de CBZ (Komga, Kavita, Tachiyomi) sabem ler. */
const comicInfo = (info: ChapterDownloadInfo) => {
  const fields: [string, string | number | null][] = [
    ["Series", info.series],
    ["Number", info.chapter.number],
    ["Volume", info.chapter.volume],
    ["Title", info.chapter.title],
    ["Translator", info.version.group],
    ["LanguageISO", info.language === "pt-br" ? "pt-BR" : "en"],
    ["PageCount", info.pages.length],
    ["Manga", "YesAndRightToLeft"],
    ["Web", `https://mangadex.org/chapter/${info.version.id}`],
  ];

  const body = fields
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => `  <${key}>${escapeXml(String(value))}</${key}>`)
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>\n<ComicInfo>\n${body}\n</ComicInfo>\n`;
};

const extension = (blob: Blob, url: string) =>
  blob.type.split("/")[1]?.replace("jpeg", "jpg") ||
  url.split(".").pop() ||
  "jpg";

const buildCbz = async (blobs: Blob[], info: ChapterDownloadInfo) => {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const digits = String(blobs.length).length;

  blobs.forEach((blob, index) => {
    const name = String(index + 1).padStart(Math.max(3, digits), "0");
    zip.file(`${name}.${extension(blob, info.pages[index])}`, blob);
  });
  zip.file("ComicInfo.xml", comicInfo(info));

  // Imagens já vêm comprimidas: comprimir de novo só gasta tempo.
  return zip.generateAsync({ type: "blob", compression: "STORE", mimeType: "application/vnd.comicbook+zip" });
};

const chapterTitle = (chapter: MangaChapterProps) =>
  chapter.number ? `Cap ${chapter.number}` : "One-shot";

/** Nome seguro em qualquer sistema de arquivos. */
export const chapterFileName = (info: ChapterDownloadInfo, format: ChapterDownloadFormat) =>
  `${info.series} - ${chapterTitle(info.chapter)}`
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150) + `.${format}`;

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // O navegador precisa do endereço até começar a gravar o arquivo.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const downloadChapter = async (
  info: ChapterDownloadInfo,
  format: ChapterDownloadFormat,
  options: DownloadOptions = {}
) => {
  const blobs = await fetchPages(info.pages, options);
  const file = format === "pdf" ? await buildPdf(blobs, info) : await buildCbz(blobs, info);
  saveBlob(file, chapterFileName(info, format));
};
