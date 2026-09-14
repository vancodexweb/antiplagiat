// Имя DI-токена клиента очереди и паттерн сообщения — общие для api
// (публикация) и worker (потребление), поэтому вынесены в общий файл.
export const DOCUMENTS_QUEUE_CLIENT = 'DOCUMENTS_QUEUE_CLIENT';
export const ANALYZE_DOCUMENT_PATTERN = 'analyze_document';
