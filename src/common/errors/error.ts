import { HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  // Common
  INTERNAL_SERVER_ERROR = 'E001',
  INVALID_INPUT_VALUE = 'E002',

  // User
  USER_NOT_FOUND = 'U001',
  EMAIL_ALREADY_EXISTS = 'U002',

  // Database
  DATABASE_ERROR = 'D001',
  QUERY_FAILED = 'D002',

  // Document Analyzer
  GEMINI_API_ERROR = 'A001',
  FILE_UPLOAD_ERROR = 'A002',
  FILE_NOT_FOUND = 'A003',
  GEMINI_API_KEY_INVALID = 'A004',
  GEMINI_API_REQUEST_FAILED = 'A005',

  // Auth
  TOKEN_NOT_FOUND = 'AUTH001',
  KAKAO_VAL_NOT_FOUND = 'AUTH002'
}

export const ErrorDictionary: Record<ErrorCode, { status: HttpStatus; message: string }> = {
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '서버 내부 오류가 발생했습니다. 관리자에게 문의해주세요.',
  },
  [ErrorCode.INVALID_INPUT_VALUE]: {
    status: HttpStatus.BAD_REQUEST,
    message: '입력값이 올바르지 않습니다.',
  },
  [ErrorCode.USER_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: '사용자를 찾을 수 없습니다.',
  },
  [ErrorCode.EMAIL_ALREADY_EXISTS]: {
    status: HttpStatus.CONFLICT,
    message: '이미 존재하는 이메일입니다.',
  },
  [ErrorCode.DATABASE_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '데이터베이스 연동 중 오류가 발생했습니다.',
  },
  [ErrorCode.QUERY_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '데이터 처리 중 오류가 발생했습니다.',
  },
  [ErrorCode.GEMINI_API_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Gemini API 연동 중 오류가 발생했습니다.',
  },
  [ErrorCode.FILE_UPLOAD_ERROR]: {
    status: HttpStatus.BAD_REQUEST,
    message: '파일 업로드 중 오류가 발생했습니다.',
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: '파일을 찾을 수 없습니다.',
  },
  [ErrorCode.GEMINI_API_KEY_INVALID]: {
    status: HttpStatus.BAD_REQUEST,
    message: '잘못된 Gemini API 키입니다. .env 파일을 확인하세요.',
  },
  [ErrorCode.GEMINI_API_REQUEST_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Gemini API로 문서를 분석하지 못했습니다. 서버 로그에서 자세한 내용을 확인하세요.',
  },
  [ErrorCode.TOKEN_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: '토큰을 찾을 수 없습니다.',
  },
  [ErrorCode.KAKAO_VAL_NOT_FOUND]: {
    status: HttpStatus.BAD_REQUEST,
    message: '카카오 환경변수가 설정되지 않았습니다.',
  }
};
