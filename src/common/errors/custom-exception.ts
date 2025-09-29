import { HttpException } from '@nestjs/common';
import { ErrorCode, ErrorDictionary } from './error';

export class CustomException extends HttpException {
  constructor(errorCode: ErrorCode, message?: string) {
    const error = ErrorDictionary[errorCode];
    super({ errorCode, message: message || error.message }, error.status);
  }
}
