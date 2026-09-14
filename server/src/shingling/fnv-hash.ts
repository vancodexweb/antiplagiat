// FNV-1a — быстрое 32-битное хеширование строк. Криптостойкость здесь не
// нужна (это не пароли), важны скорость и низкая частота коллизий на
// коротких строках вроде шинглов.
export function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
