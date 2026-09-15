import { Injectable, Logger } from '@nestjs/common';
import JSZip from 'jszip';

export interface TamperingFinding {
  type: 'HOMOGLYPH' | 'ZERO_WIDTH' | 'HIDDEN_TEXT' | 'TINY_FONT';
  position?: number;
  details?: string;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Невидимые/управляющие символы, которыми можно "спрятать" содержимое от
// текстового анализа (раздел 3.7 ТЗ): zero-width space, мягкий перенос,
// zero-width non-joiner/joiner, word joiner, BOM, метки направления письма.
const INVISIBLE_CHARS_RE = /[​­‌‍⁠﻿‎‏]/gu;

// Порог "микрошрифта" в полупунктах (единица измерения w:sz в OOXML) —
// 12 полупунктов = 6pt, заметно меньше стандартных 10-14pt.
const TINY_FONT_HALF_POINTS_THRESHOLD = 12;

// Собственная таблица гомоглифов кириллица<->латиница (раздел 3.7 ТЗ
// прямо разрешает такой подход как альтернативу unicode-confusables).
// Библиотека unicode-confusables оказалась непригодна для нашего случая:
// она считает "подозрительными" только нелатинские символы, похожие на
// латинские (это IDN-антифишинговый сценарий), и никогда не помечает
// латинскую букву как "похожую на кириллицу" — то есть не ловит именно
// направление атаки из ТЗ (а→a, е→e — кириллица подменяется латиницей).
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', е: 'e', ё: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x',
  А: 'A', В: 'B', Е: 'E', З: '3', К: 'K', М: 'M', Н: 'H', О: 'O',
  Р: 'P', С: 'C', Т: 'T', У: 'Y', Х: 'X', Ё: 'E', Ѕ: 'S', і: 'i',
};
const LATIN_TO_CYRILLIC: Record<string, string> = Object.fromEntries(
  Object.entries(CYRILLIC_TO_LATIN).map(([cyr, lat]) => [lat, cyr]),
);

/**
 * Попытки обмана системы антиплагиата (раздел 3.7 ТЗ). Выполняется
 * синхронно при загрузке — нужен доступ к исходному файлу (для DOCX-
 * специфичных проверок), который после извлечения текста не сохраняется.
 */
@Injectable()
export class TamperingService {
  private readonly logger = new Logger(TamperingService.name);

  async scan(buffer: Buffer, mimeType: string, text: string): Promise<TamperingFinding[]> {
    const findings: TamperingFinding[] = [this.detectHomoglyphs(text), this.detectInvisibleChars(text)].flat();

    if (mimeType === DOCX_MIME) {
      try {
        findings.push(...(await this.scanDocx(buffer)));
      } catch (error) {
        this.logger.warn(`Не удалось проверить DOCX на скрытый текст/микрошрифт: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return findings;
  }

  // Гомоглифы: символы одного алфавита, визуально неотличимые от символов
  // другого — классический приём подмены букв для обмана
  // посимвольного/шингл-сравнения текста. Почти каждая кириллическая
  // гласная имеет латинского визуального двойника, поэтому наивная
  // проверка "это буква из другого алфавита" ложно сработала бы на КАЖДОЙ
  // обычной кириллической букве обычного текста. Вместо этого определяем
  // преобладающий алфавит документа и ищем "точечные" подмены — слова,
  // которые в основном на "родном" алфавите, но содержат одну-две буквы
  // из другого. Слово ЦЕЛИКОМ на другом алфавите (например, случайное
  // англоязычное заимствование) пропускаем — это не подмена, а обычное
  // иноязычное слово.
  private detectHomoglyphs(text: string): TamperingFinding[] {
    const findings: TamperingFinding[] = [];
    const letters = [...text].filter((ch) => isCyrillic(ch) || isLatin(ch));
    if (letters.length === 0) return findings;

    const cyrillicCount = letters.filter(isCyrillic).length;
    const dominant: 'cyrillic' | 'latin' = cyrillicCount >= letters.length / 2 ? 'cyrillic' : 'latin';
    const table = dominant === 'cyrillic' ? LATIN_TO_CYRILLIC : CYRILLIC_TO_LATIN;
    const dominantName = dominant === 'cyrillic' ? 'кириллицы' : 'латиницы';
    const isDominantScript = dominant === 'cyrillic' ? isCyrillic : isLatin;

    const wordRe = /[\p{L}]+/gu;
    let match: RegExpExecArray | null;
    while ((match = wordRe.exec(text)) !== null) {
      const word = match[0];
      const chars = [...word];
      const dominantCharCount = chars.filter(isDominantScript).length;
      if (dominantCharCount === 0) continue; // слово целиком на другом алфавите — не подмена

      chars.forEach((ch, i) => {
        const lookalike = table[ch];
        if (!lookalike) return;
        findings.push({
          type: 'HOMOGLYPH',
          position: match!.index + i,
          details: `Символ "${ch}" в слове "${word}" похож на "${lookalike}" из ${dominantName} — ожидаемого алфавита документа`,
        });
      });
    }

    return findings;
  }

  private detectInvisibleChars(text: string): TamperingFinding[] {
    const findings: TamperingFinding[] = [];
    let match: RegExpExecArray | null;
    INVISIBLE_CHARS_RE.lastIndex = 0;
    while ((match = INVISIBLE_CHARS_RE.exec(text)) !== null) {
      findings.push({
        type: 'ZERO_WIDTH',
        position: match.index,
        details: `Невидимый символ U+${match[0].codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`,
      });
    }
    return findings;
  }

  private async scanDocx(buffer: Buffer): Promise<TamperingFinding[]> {
    const zip = await JSZip.loadAsync(buffer);
    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) return [];

    const xml = await documentXmlFile.async('text');
    const findings: TamperingFinding[] = [];

    // Скрытый текст: <w:vanish/> либо белый цвет шрифта (w:color w:val="FFFFFF")
    // — классический приём "спрятать текст от антиплагиата" (раздел 3.7 ТЗ).
    const vanishCount = (xml.match(/<w:vanish\s*\/>/g) ?? []).length;
    if (vanishCount > 0) {
      findings.push({ type: 'HIDDEN_TEXT', details: `Найдено скрытых фрагментов (w:vanish): ${vanishCount}` });
    }

    const whiteColorCount = (xml.match(/<w:color[^>]*w:val="FFFFFF"/gi) ?? []).length;
    if (whiteColorCount > 0) {
      findings.push({
        type: 'HIDDEN_TEXT',
        details: `Найден текст белого цвета (w:color val="FFFFFF"): ${whiteColorCount}`,
      });
    }

    // Микрошрифт: <w:sz w:val="N"/> — N в полупунктах.
    const tinyFontSizes = [...xml.matchAll(/<w:sz\s+w:val="(\d+)"/g)]
      .map((m) => Number(m[1]))
      .filter((size) => size > 0 && size < TINY_FONT_HALF_POINTS_THRESHOLD);
    if (tinyFontSizes.length > 0) {
      findings.push({
        type: 'TINY_FONT',
        details: `Найден аномально мелкий шрифт (${tinyFontSizes.length} фрагм., минимум ${Math.min(...tinyFontSizes) / 2}pt)`,
      });
    }

    return findings;
  }
}

function isCyrillic(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x0400 && code <= 0x04ff;
}

function isLatin(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a);
}
