import { HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  // Common
  INTERNAL_SERVER_ERROR = 'E001',
  INVALID_INPUT_VALUE = 'E002',
  ESTATE_NOT_FOUND = 'E003',

  // User
  USER_NOT_FOUND = 'U001',

  // Term
  TERM_NOT_FOUND = 'T001',

  // S3
  S3_CONFIG_ERROR = 'S001',
  S3_UPLOAD_FAILED = 'S002',
  S3_DOWNLOAD_FAILED = 'S003',
  S3_DELETE_FAILED = 'S004',
  S3_FILE_NOT_FOUND = 'S005',

  // Cache & Redis
  CACHE_ERROR = 'C001',
  REDIS_CONNECTION_ERROR = 'C002',
  CACHE_PARSE_ERROR = 'C003',

  // OCR
  OCR_PROCESSING_FAILED = 'O001',
  OCR_INVALID_IMAGE = 'O002',

  // Document
  DOCUMENT_PROCESSING_FAILED = 'DOC001',
  DOCUMENT_ANALYSIS_FAILED = 'DOC002',
  NOT_REAL_ESTATE_DOCUMENT = 'DOC003',
  OCR_TEXT_TOO_SHORT = 'DOC004',
  DOCUMENT_VALIDATION_UNCERTAIN = 'DOC005',

  // Database
  DATABASE_ERROR = 'D001',
  QUERY_FAILED = 'D002',

  // Document Analyzer
  GEMINI_API_ERROR = 'A001',
  FILE_UPLOAD_ERROR = 'A002',
  FILE_NOT_FOUND = 'A003',
  GEMINI_API_KEY_INVALID = 'A004',
  GEMINI_API_REQUEST_FAILED = 'A005',
  GPT_API_REQUEST_FAILED = 'A006',
  GPT_API_KEY_INVALID = 'A007',
  GEMINI_MODEL_NAME_INVALID = 'A008',
  GPT_MODEL_NAME_INVALID = 'A009',

  // Auth
  TOKEN_NOT_FOUND = 'AUTH001',
  KAKAO_VAL_NOT_FOUND = 'AUTH002',
  INVALID_REFRESH_TOKEN = 'AUTH003',
  ACCESS_DENIED = 'AUTH004',
  INVALID_TOKEN = 'AUTH005',
  TERMS_NOT_AGREED = 'AUTH006',
  INVALID_TERM_ID_FORMAT = 'AUTH007',
  INVALID_AGREEMENT_VALUE = 'AUTH008',
  TERMS_ALREADY_AGREED = 'AUTH009',
}

export const ErrorDictionary: Record<
  ErrorCode,
  { status: HttpStatus; message: string }
> = {
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '서버 내부 오류가 발생했습니다. 관리자에게 문의해주세요.',
  },
  [ErrorCode.INVALID_INPUT_VALUE]: {
    status: HttpStatus.BAD_REQUEST,
    message: '입력값이 올바르지 않습니다.',
  },
  [ErrorCode.ESTATE_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: '매물을 찾을 수 없습니다.',
  },
  [ErrorCode.USER_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: '사용자를 찾을 수 없습니다.',
  },
  [ErrorCode.TERM_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: '약관을 찾을 수 없습니다.',
  },
  [ErrorCode.S3_CONFIG_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'S3 설정이 올바르지 않습니다. .env 파일을 확인하세요.',
  },
  [ErrorCode.S3_UPLOAD_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '파일 업로드 중 오류가 발생했습니다.',
  },
  [ErrorCode.S3_DOWNLOAD_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '파일 다운로드 중 오류가 발생했습니다.',
  },
  [ErrorCode.S3_DELETE_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '파일 삭제 중 오류가 발생했습니다.',
  },
  [ErrorCode.S3_FILE_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'S3에서 파일을 찾을 수 없습니다.',
  },
  [ErrorCode.CACHE_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '캐시 처리 중 오류가 발생했습니다.',
  },
  [ErrorCode.REDIS_CONNECTION_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Redis 연결 중 오류가 발생했습니다.',
  },
  [ErrorCode.CACHE_PARSE_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '캐시 파싱 중 오류가 발생했습니다.',
  },
  [ErrorCode.OCR_PROCESSING_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'OCR 처리 중 오류가 발생했습니다.',
  },
  [ErrorCode.OCR_INVALID_IMAGE]: {
    status: HttpStatus.BAD_REQUEST,
    message: '유효하지 않은 이미지 파일입니다.',
  },
  [ErrorCode.DOCUMENT_PROCESSING_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '문서 처리 중 오류가 발생했습니다.',
  },
  [ErrorCode.DOCUMENT_ANALYSIS_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '문서 분석 중 오류가 발생했습니다.',
  },
  [ErrorCode.NOT_REAL_ESTATE_DOCUMENT]: {
    status: HttpStatus.BAD_REQUEST,
    message: '부동산 관련 문서가 아닙니다. 등기부등본, 건축물대장, 전세계약서 등을 업로드해주세요.',
  },
  [ErrorCode.OCR_TEXT_TOO_SHORT]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'OCR로 추출한 텍스트가 너무 짧습니다. 더 선명한 이미지를 업로드해주세요.',
  },
  [ErrorCode.DOCUMENT_VALIDATION_UNCERTAIN]: {
    status: HttpStatus.BAD_REQUEST,
    message: '문서 유형을 명확히 판별할 수 없습니다. 더 선명한 이미지를 업로드하거나, 부동산 관련 문서가 맞는지 확인해주세요.',
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
  [ErrorCode.GPT_API_KEY_INVALID]: {
    status: HttpStatus.BAD_REQUEST,
    message: '잘못된 GPT API 키입니다. .env 파일을 확인하세요.',
  },
  [ErrorCode.GEMINI_MODEL_NAME_INVALID]: {
    status: HttpStatus.BAD_REQUEST,
    message: '잘못된 Gemini 모델 이름입니다. .env 파일을 확인하세요.',
  },
  [ErrorCode.GPT_MODEL_NAME_INVALID]: {
    status: HttpStatus.BAD_REQUEST,
    message: '잘못된 GPT 모델 이름입니다. .env 파일을 확인하세요.',
  },
  [ErrorCode.GEMINI_API_REQUEST_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      'Gemini API로 문서를 분석하지 못했습니다. 서버 로그에서 자세한 내용을 확인하세요.',
  },
  [ErrorCode.GPT_API_REQUEST_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      'GPT API로 문서를 분석하지 못했습니다. 서버 로그에서 자세한 내용을 확인하세요.',
  },
  [ErrorCode.TOKEN_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: '토큰을 찾을 수 없습니다.',
  },
  [ErrorCode.KAKAO_VAL_NOT_FOUND]: {
    status: HttpStatus.BAD_REQUEST,
    message: '카카오 환경변수가 설정되지 않았습니다.',
  },
  [ErrorCode.INVALID_REFRESH_TOKEN]: {
    status: HttpStatus.BAD_REQUEST,
    message: '올바르지 않은 리프레시 토큰입니다.',
  },
  [ErrorCode.ACCESS_DENIED]: {
    status: HttpStatus.FORBIDDEN,
    message: '접근 권한이 없습니다.',
  },
  [ErrorCode.INVALID_TOKEN]: {
    status: HttpStatus.UNAUTHORIZED,
    message: '유효하지 않은 토큰입니다.',
  },
  [ErrorCode.TERMS_NOT_AGREED]: {
    status: HttpStatus.BAD_REQUEST,
    message: '필수 약관에 동의해야 합니다.',
  },
  [ErrorCode.INVALID_TERM_ID_FORMAT]: {
    status: HttpStatus.BAD_REQUEST,
    message: '약관 ID 형식이 올바르지 않습니다.',
  },
  [ErrorCode.INVALID_AGREEMENT_VALUE]: {
    status: HttpStatus.BAD_REQUEST,
    message: '약관 동의 값이 올바르지 않습니다.',
  },
  [ErrorCode.TERMS_ALREADY_AGREED]: {
    status: HttpStatus.CONFLICT,
    message: '이미 약관 동의가 완료된 사용자입니다.',
  },
};
