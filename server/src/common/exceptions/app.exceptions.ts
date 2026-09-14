import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Базовый класс всех предметных исключений приложения. Несёт errorCode и
 * details, которые HttpExceptionFilter кладёт в единый конверт ответа
 * (раздел 7 ТЗ) — контроллеры не должны кидать голый `HttpException`/`Error`.
 */
export class AppException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus,
    public readonly details: unknown = null,
  ) {
    super(message, statusCode);
  }
}

export class ValidationException extends AppException {
  constructor(details: ValidationErrorDetail[]) {
    super(ErrorCode.VALIDATION_ERROR, 'Ошибка валидации входных данных', HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export class UnsupportedFileTypeException extends AppException {
  constructor(mimeType: string) {
    super(
      ErrorCode.UNSUPPORTED_FILE_TYPE,
      `Неподдерживаемый тип файла: ${mimeType}. Разрешены PDF, DOCX и TXT`,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      { mimeType },
    );
  }
}

export class FileTooLargeException extends AppException {
  constructor(maxSizeMb: number) {
    super(
      ErrorCode.FILE_TOO_LARGE,
      `Файл превышает допустимый размер ${maxSizeMb} МБ`,
      HttpStatus.PAYLOAD_TOO_LARGE,
      { maxSizeMb },
    );
  }
}

export class DocumentNotFoundException extends AppException {
  constructor(id: string) {
    super(ErrorCode.DOCUMENT_NOT_FOUND, 'Документ с указанным ID не найден', HttpStatus.NOT_FOUND, { id });
  }
}

export class AnalysisInProgressException extends AppException {
  constructor(id: string) {
    super(
      ErrorCode.ANALYSIS_IN_PROGRESS,
      'Анализ документа ещё выполняется, результат пока недоступен',
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class AnalysisFailedException extends AppException {
  constructor(stage: string, details?: unknown) {
    super(ErrorCode.ANALYSIS_FAILED, `Пайплайн анализа завершился с ошибкой на этапе "${stage}"`, HttpStatus.INTERNAL_SERVER_ERROR, {
      stage,
      ...(details && typeof details === 'object' ? details : { details }),
    });
  }
}

export class NlpServiceUnavailableException extends AppException {
  constructor(details?: unknown) {
    super(
      ErrorCode.NLP_SERVICE_UNAVAILABLE,
      'Сервис NLP-анализа временно недоступен',
      HttpStatus.SERVICE_UNAVAILABLE,
      details ?? null,
    );
  }
}

export class RateLimitedException extends AppException {
  constructor() {
    super(ErrorCode.RATE_LIMITED, 'Превышен лимит запросов, попробуйте позже', HttpStatus.TOO_MANY_REQUESTS);
  }
}
