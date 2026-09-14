import { ValidationError } from '@nestjs/common';
import { ValidationErrorDetail, ValidationException } from './app.exceptions';

// Разворачивает дерево ValidationError (в т.ч. вложенные объекты) в плоский
// список { field, message }, который кладётся в details ответа VALIDATION_ERROR.
function flatten(errors: ValidationError[], parentPath = ''): ValidationErrorDetail[] {
  const result: ValidationErrorDetail[] = [];

  for (const error of errors) {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        result.push({ field, message });
      }
    }

    if (error.children?.length) {
      result.push(...flatten(error.children, field));
    }
  }

  return result;
}

export function validationExceptionFactory(errors: ValidationError[]): ValidationException {
  return new ValidationException(flatten(errors));
}
