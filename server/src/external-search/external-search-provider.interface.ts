export interface ExternalSearchMatch {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Внешняя проверка по интернету (раздел 3.2 ТЗ) — поиск редких шинглов
 * документа (не найденных в локальном корпусе) через внешнюю поисковую
 * систему. Полностью опционально: без ключей провайдера используется
 * NoopExternalSearchProvider и не блокирует локальный запуск проекта.
 */
export interface ExternalSearchProvider {
  readonly name: string;
  search(query: string): Promise<ExternalSearchMatch[]>;
}
