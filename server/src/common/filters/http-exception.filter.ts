import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exceptions';
import { ErrorCode } from '../exceptions/error-code.enum';

interface ErrorEnvelope {
  success: false;
  errorCode: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details: unknown;
}

// Соответствие стандартных HTTP-статусов кодам ошибок для исключений,
// которые не являются нашими AppException (например, встроенные guard'ы
// Nest вроде UnauthorizedException).
const STATUS_TO_ERROR_CODE: Record<number, ErrorCode | string> = {
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
};

/**
 * Глобальный фильтр ошибок — приводит абсолютно любое исключение к единому
 * конверту ответа (раздел 7 ТЗ), чтобы клиент API никогда не видел "сырые"
 * стек-трейсы или разномастные форматы ошибок от разных частей приложения.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, errorCode, message, details } = this.resolve(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode} ${errorCode}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const envelope: ErrorEnvelope = {
      success: false,
      errorCode,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      details: details ?? null,
    };

    response.status(statusCode).json(envelope);
  }

  private resolve(exception: unknown): { statusCode: number; errorCode: string; message: string; details: unknown } {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        errorCode: exception.errorCode,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        errorCode: ErrorCode.RATE_LIMITED,
        message: 'Превышен лимит запросов, попробуйте позже',
        details: null,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string' ? response : ((response as Record<string, unknown>)?.message ?? exception.message);
      return {
        statusCode,
        errorCode: String(STATUS_TO_ERROR_CODE[statusCode] ?? 'HTTP_ERROR'),
        message: Array.isArray(message) ? message.join('; ') : String(message),
        details: null,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Внутренняя ошибка сервера',
      details: null,
    };
  }
}
