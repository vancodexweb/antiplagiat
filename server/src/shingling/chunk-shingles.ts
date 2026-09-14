// Один MinHash на весь документ ловит только почти-дословное совпадение
// ДОКУМЕНТОВ ЦЕЛИКОМ: если скопирован один абзац из большой работы, общий
// коэффициент Жаккара всего текста слишком мал, чтобы пройти через LSH.
// Поэтому шинглы режутся на перекрывающиеся окна (чанки), и MinHash/LSH
// считается для каждого окна отдельно — скопированный кусок текста тогда
// почти наверняка целиком попадёт хотя бы в одно окно и будет найден.
export function chunkShingles<T>(items: T[], chunkSize: number, stride: number): T[][] {
  if (items.length === 0) return [];

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += stride) {
    chunks.push(items.slice(i, i + chunkSize));
    if (i + chunkSize >= items.length) break;
  }
  return chunks;
}

export const CHUNK_SIZE = 20;
export const CHUNK_STRIDE = 10;
