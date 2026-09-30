/**
 * Onde a pessoa parou em cada mangá e como ela gosta de ler. Fica só neste
 * browser: é conveniência, e perder isso (modo privado, storage limpo) só faz
 * a ficha voltar a oferecer "Começar a ler".
 */

const PROGRESS_PREFIX = "anime-complex:manga-progress:";
const PREFS_KEY = "anime-complex:reader-prefs";

export interface ReadingProgress {
  /** ID da tradução no MangaDex, que é o que a rota do leitor recebe. */
  versionId: string;
  number: string | null;
  language: MangaLanguage;
  /** Base zero. */
  page: number;
  updatedAt: number;
}

export type ReaderMode = "vertical" | "paged";
export type ReaderFit = "width" | "height";

export interface ReaderPrefs {
  mode: ReaderMode;
  fit: ReaderFit;
  dataSaver: boolean;
}

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  mode: "vertical",
  fit: "width",
  dataSaver: false,
};

const read = <T>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem storage (modo privado, cota cheia): segue sem lembrar.
  }
};

export const getReadingProgress = (mangaId: string) =>
  read<ReadingProgress>(PROGRESS_PREFIX + mangaId);

export const saveReadingProgress = (
  mangaId: string,
  progress: Omit<ReadingProgress, "updatedAt">
) => write(PROGRESS_PREFIX + mangaId, { ...progress, updatedAt: Date.now() });

export const getReaderPrefs = (): ReaderPrefs => ({
  ...DEFAULT_READER_PREFS,
  ...read<Partial<ReaderPrefs>>(PREFS_KEY),
});

export const saveReaderPrefs = (prefs: ReaderPrefs) => write(PREFS_KEY, prefs);
