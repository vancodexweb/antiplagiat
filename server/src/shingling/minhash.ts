// MinHash — компактная сигнатура множества шинглов документа (раздел 3.2
// ТЗ). Вместо сравнения всех шинглов двух документов попарно, у каждого
// документа считается NUM_HASHES "минимумов" под разными перестановками —
// доля совпавших минимумов между двумя сигнатурами приближает реальный
// коэффициент Жаккара их множеств шинглов, и именно по сигнатуре строится
// LSH-индекс для быстрого поиска кандидатов (см. lsh-index.service.ts).

export const NUM_HASHES = 64;

const MERSENNE_PRIME = 2147483647n; // 2^31 - 1 — простое число для универсального хеширования

// Детерминированные коэффициенты перестановок: генерируются один раз по
// фиксированному seed простым LCG, чтобы api и worker всегда считали
// сигнатуры одинаково, не храня и не синхронизируя никакого состояния.
function generateCoefficients(count: number, seed: number): bigint[] {
  const coeffs: bigint[] = [];
  let state = seed >>> 0;
  for (let i = 0; i < count; i++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    coeffs.push(BigInt((state % 2147483646) + 1));
  }
  return coeffs;
}

const A_COEFFS = generateCoefficients(NUM_HASHES, 42);
const B_COEFFS = generateCoefficients(NUM_HASHES, 2024);

export function computeMinHashSignature(hashes: number[]): number[] {
  const signature = new Array<bigint>(NUM_HASHES).fill(MERSENNE_PRIME);

  for (const hNum of hashes) {
    const h = BigInt(hNum >>> 0);
    for (let i = 0; i < NUM_HASHES; i++) {
      const permuted = (A_COEFFS[i] * h + B_COEFFS[i]) % MERSENNE_PRIME;
      if (permuted < signature[i]) {
        signature[i] = permuted;
      }
    }
  }

  return signature.map((v) => Number(v));
}
