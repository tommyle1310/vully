import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Logger } from 'nestjs-pino';

interface ErrorResponse {
  data: null;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  }>;
  meta: {
    timestamp: string;
    path: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const response = exceptionResponse as Record<string, unknown>;
        message = (response.message as string) || message;
        code = (response.error as string)?.toUpperCase().replace(/ /g, '_') || code;
        details = response.details as Record<string, unknown>;

        // Handle validation errors
        if (Array.isArray(response.message)) {
          message = 'Validation failed';
          details = { validationErrors: response.message };
        }
      }
    }

    // Map HTTP status to error code
    code = this.getErrorCode(status, code);

    const errorResponse: ErrorResponse = {
      data: null,
      errors: [
        {
          code,
          message,
          ...(details && { details }),
        },
      ],
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    // Log the error
    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          statusCode: status,
          path: request.url,
          method: request.method,
        },
        message,
      );
    } else {
      this.logger.warn(
        {
          statusCode: status,
          path: request.url,
          method: request.method,
          message,
        },
        'HTTP Exception',
      );
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number, defaultCode: string): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };

    return statusCodeMap[status] || defaultCode;
  }
}
