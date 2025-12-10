# 부동산 분석 리포트 API 테스트 케이스 문서

## 1. API 개요
- API 이름: 부동산 분석 리포트 API
- 설명: 부동산 문서 분석을 수행하고 결과를 관리하는 API
- HTTP Method: POST, GET
- URI: /estate-analysis
- 요청 파라미터: estateId (GET 단일 조회 시), 쿼리 파라미터 (검색 시)
- 요청 Body: CreateEstateAnalysisDto (분석 요청 시)
- 응답 Body: EstateAnalysisReportResponseDto, PaginationResponseDto

## 2. 테스트 케이스 목록 (표로 작성)

| Test ID | 시나리오 설명 | 입력값(Params/Query/Body) | 예상 응답 상태코드 | 예상 응답 내용 |
|--------|----------------|----------------------------|---------------------|----------------|
| TC-001 | 정상적인 부동산 분석 요청 | 유효한 주소, 계약정보, 문서 ID 배열 | 201 | 분석 결과 객체 반환 |
| TC-002 | 분석 요청 시 필수 문서 ID 누락 | documentIds 필드 없음 | 400 | 유효성 검증 오류 메시지 |
| TC-003 | 존재하지 않는 문서 ID로 분석 요청 | 존재하지 않는 documentIds | 400 | 문서 존재하지 않음 오류 |
| TC-004 | 주소 길이 초과로 분석 요청 | 256자 이상 주소 | 400 | 주소 길이 초과 오류 |
| TC-005 | 음수 보증금으로 분석 요청 | deposit: -1000000 | 400 | 보증금 최소값 오류 |
| TC-006 | 존재하는 부동산의 분석 결과 조회 | 유효한 estateId | 200 | 분석 결과 객체 반환 |
| TC-007 | 존재하지 않는 부동산의 분석 결과 조회 | 존재하지 않는 estateId | 404 | 부동산을 찾을 수 없음 오류 |
| TC-008 | 분석 완료되지 않은 부동산 조회 | 분석 진행 중인 estateId | 200 | 모든 필드가 null인 빈 응답 |
| TC-009 | 분석 리포트 목록 검색 (기본) | 빈 쿼리 파라미터 | 200 | 페이징된 분석 리포트 목록 |
| TC-010 | 안전 점수 필터로 검색 | safetyScore: "SAFE" | 200 | SAFE 상태 리포트만 필터링된 목록 |
| TC-011 | 주소 검색어로 검색 | address: "서울" | 200 | 주소에 "서울" 포함된 리포트 목록 |
| TC-012 | 페이지네이션 적용 검색 | page: 2, limit: 10 | 200 | 2페이지 10개 항목 반환 |
| TC-013 | 잘못된 안전 점수 값으로 검색 | safetyScore: "INVALID" | 400 | 잘못된 enum 값 오류 |
| TC-014 | 인증 토큰 없이 분석 요청 | Authorization 헤더 없음 | 401 | 인증 필요 오류 |
| TC-015 | 인증 토큰 없이 결과 조회 | Authorization 헤더 없음 | 401 | 인증 필요 오류 |
| TC-016 | 인증 토큰 없이 목록 검색 | Authorization 헤더 없음 | 401 | 인증 필요 오류 |
| TC-017 | 잘못된 형식의 estateId 조회 | estateId: "abc" | 400 | 파라미터 타입 오류 |
| TC-018 | 페이지네이션 음수 값 | page: -1 | 400 | 페이지 최소값 오류 |
| TC-019 | 페이지네이션 최대값 초과 | limit: 101 | 400 | limit 최대값 오류 |
| TC-020 | 계약 타입으로 월세 분석 요청 | contractType: "월세" | 201 | 월세 계약 분석 결과 |

## 3. 정상 케이스 상세

### TC-001: 정상적인 부동산 분석 요청
- 시나리오 설명: 유효한 부동산 정보와 문서 ID로 분석을 요청하는 경우
- 사전 조건: 인증된 사용자, 존재하는 문서 ID들
- 요청 값:
  ```json
  {
    "address": "서울특별시 강남구 테헤란로 123",
    "addressDetail": "101동 101호",
    "contractType": "전세",
    "deposit": 100000000,
    "monthlyRent": 0,
    "kbMarketPrice": 500000000,
    "documentIds": [1, 2, 3]
  }
  ```
- 예상 동작: AI 분석 수행 후 결과 저장 및 반환
- 예상 응답:
  ```json
  {
    "id": 1,
    "estateId": 1,
    "analyzedAt": "2025-12-10T10:00:00.000Z",
    "safetyScore": 85,
    "address": "서울특별시 강남구 테헤란로 123",
    "buildingStructure": "철근콘크리트조",
    "buildingUsage": "공동주택",
    "ownershipStatus": "정상",
    "titleSectionAnalysisResult": "SAFE",
    "ownershipSectionAnalysisResult": "SAFE",
    "rightsSectionAnalysisResult": "SAFE",
    "isInsuranceEligible": true
  }
  ```

### TC-006: 존재하는 부동산의 분석 결과 조회
- 시나리오 설명: 분석이 완료된 부동산의 결과를 조회하는 경우
- 사전 조건: 분석 완료된 estateId 존재
- 요청 값: GET /estate-analysis/1
- 예상 동작: 분석 결과 반환
- 예상 응답:
  ```json
  {
    "id": 1,
    "estateId": 1,
    "analyzedAt": "2025-12-10T10:00:00.000Z",
    "safetyScore": 100,
    "address": "서울특별시 관악구 낙성대역6길 17-8",
    "buildingStructure": "철근콘크리트조",
    "buildingUsage": "단독(다중)주택, 근린생활시설",
    "totalFloors": "지상 5층, 지하 1층, 옥탑 1층",
    "totalLandArea": 215,
    "landRightRatio": "전부",
    "hasSeparateRegistration": false,
    "isIllegalConstruction": null,
    "ownershipStatus": "CLEAR",
    "currentOwner": "강환숙",
    "transferDate": "2020-07-13",
    "transferCause": "매매",
    "pastOwnerChangeCount": 3,
    "hasOwnershipRestriction": false,
    "titleSectionAnalysisSummary": "건물 등기부와 토지 등기부의 주소, 소유자 정보가 모두 일치합니다...",
    "titleSectionAnalysisResult": "SAFE",
    "ownershipSectionAnalysisSummary": "2020년 7월 13일 매매를 통해 현재 소유자 '강환숙'님이...",
    "ownershipSectionAnalysisResult": "SAFE",
    "rightsSectionAnalysisSummary": "을구(소유권 이외의 권리에 관한 사항)에 '기록사항 없음'으로 기재되어 있습니다...",
    "rightsSectionAnalysisResult": "SAFE",
    "rightsAnalysisSummary": "본 부동산은 토지와 건물 소유자가 동일하며...",
    "recommendedContractClauses": [
      "잔금 지급일 당일에 등기부등본을 다시 발급받아...",
      "본 계약은 임차인의 전입신고와 확정일자가 효력을 발생하는 익일 0시까지..."
    ],
    "isInsuranceEligible": true,
    "insuranceAnalysisReasons": [
      "소유권이 명확하고 제한 사항이 없음",
      "부동산을 담보로 한 채무(근저당권)가 없어 보증금 회수 위험이 매우 낮음",
      "토지와 건물의 소유자가 동일하여 권리관계가 안정적임"
    ],
    "recommendedInsuranceCompanies": [
      "HUG주택도시보증공사",
      "SGI서울보증",
      "HF한국주택금융공사"
    ]
  }
  ```

### TC-009: 분석 리포트 목록 검색 (기본)
- 시나리오 설명: 기본 조건으로 분석 리포트 목록을 조회하는 경우
- 사전 조건: 분석 리포트 데이터 존재
- 요청 값: GET /estate-analysis
- 예상 동작: 페이징된 목록 반환
- 예상 응답:
  ```json
  {
    "data": [
      {
        "id": 1,
        "estateId": 1,
        "analyzedAt": "2025-12-10T10:00:00.000Z",
        "safetyScore": 100,
        "address": "서울특별시 관악구 낙성대역6길 17-8",
        "titleSectionAnalysisResult": "SAFE"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
  ```

## 4. 예외/에러 케이스 상세

### TC-002: 분석 요청 시 필수 문서 ID 누락
- 시나리오 설명: documentIds 필드가 누락된 경우
- 요청 값:
  ```json
  {
    "address": "서울특별시 강남구 테헤란로 123"
  }
  ```
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 400,
    "message": [
      "documentIds should not be empty"
    ],
    "error": "Bad Request"
  }
  ```

### TC-003: 존재하지 않는 문서 ID로 분석 요청
- 시나리오 설명: 존재하지 않는 documentIds로 분석 요청
- 요청 값:
  ```json
  {
    "documentIds": [999, 1000]
  }
  ```
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 400,
    "message": "문서를 찾을 수 없습니다.",
    "error": "Bad Request"
  }
  ```

### TC-004: 주소 길이 초과로 분석 요청
- 시나리오 설명: 주소가 255자를 초과하는 경우
- 요청 값:
  ```json
  {
    "address": "서울특별시 강남구 테헤란로 123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890",
    "documentIds": [1]
  }
  ```
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 400,
    "message": [
      "address must be shorter than or equal to 255 characters"
    ],
    "error": "Bad Request"
  }
  ```

### TC-005: 음수 보증금으로 분석 요청
- 시나리오 설명: 보증금이 음수인 경우
- 요청 값:
  ```json
  {
    "deposit": -1000000,
    "documentIds": [1]
  }
  ```
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 400,
    "message": [
      "deposit must not be less than 0"
    ],
    "error": "Bad Request"
  }
  ```

### TC-007: 존재하지 않는 부동산의 분석 결과 조회
- 시나리오 설명: 존재하지 않는 estateId로 조회
- 요청 값: GET /estate-analysis/99999
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 404,
    "message": "해당 부동산을 찾을 수 없습니다.",
    "error": "Not Found"
  }
  ```

### TC-008: 분석 완료되지 않은 부동산 조회
- 시나리오 설명: 분석이 진행 중이거나 완료되지 않은 부동산 조회
- 요청 값: GET /estate-analysis/1
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 200,
    "data": {
      "id": null,
      "estateId": null,
      "analyzedAt": null,
      "safetyScore": null,
      "address": null,
      "buildingStructure": null,
      "buildingUsage": null,
      "totalFloors": null,
      "totalLandArea": null,
      "exclusiveArea": null,
      "landRightRatio": null,
      "hasSeparateRegistration": null,
      "isIllegalConstruction": null,
      "ownershipStatus": null,
      "currentOwner": null,
      "transferDate": null,
      "transferCause": null,
      "pastOwnerChangeCount": null,
      "hasOwnershipRestriction": null,
      "titleSectionAnalysisSummary": null,
      "titleSectionAnalysisResult": null,
      "ownershipSectionAnalysisSummary": null,
      "ownershipSectionAnalysisResult": null,
      "rightsSectionAnalysisSummary": null,
      "rightsSectionAnalysisResult": null,
      "rightsAnalysisSummary": null,
      "recommendedContractClauses": null,
      "isInsuranceEligible": null,
      "insuranceAnalysisReasons": null,
      "recommendedInsuranceCompanies": null
    }
  }
  ```

### TC-013: 잘못된 안전 점수 값으로 검색
- 시나리오 설명: 잘못된 safetyScore enum 값으로 검색
- 요청 값: GET /estate-analysis?safetyScore=INVALID
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 400,
    "message": [
      "safetyScore must be one of the following values: SAFE, CAUTION, DANGER"
    ],
    "error": "Bad Request"
  }
  ```

### TC-014: 인증 토큰 없이 분석 요청
- 시나리오 설명: Authorization 헤더 없이 분석 요청
- 요청 값: POST /estate-analysis (헤더 없음)
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized"
  }
  ```

### TC-017: 잘못된 형식의 estateId 조회
- 시나리오 설명: estateId가 숫자가 아닌 경우
- 요청 값: GET /estate-analysis/abc
- 시스템이 반환해야 하는 상태코드 및 에러 메시지:
  ```json
  {
    "statusCode": 400,
    "message": "Validation failed (numeric string is expected)",
    "error": "Bad Request"
  }
  ```

## 5. 경계값 테스트

### 주소 길이 경계 테스트
- TC-021: 주소 최대 길이 (255자)
  - 입력: 255자 주소
  - 예상: 201 Created
- TC-022: 주소 초과 길이 (256자)
  - 입력: 256자 주소
  - 예상: 400 Bad Request

### 숫자 값 경계 테스트
- TC-023: 보증금 최소값 (0)
  - 입력: deposit: 0
  - 예상: 201 Created
- TC-024: 보증금 최대값 (999999999999)
  - 입력: 매우 큰 보증금 값
  - 예상: 201 Created (JavaScript Number.MAX_SAFE_INTEGER 고려)
- TC-025: 월세 최소값 (0)
  - 입력: monthlyRent: 0
  - 예상: 201 Created

### 페이지네이션 경계 테스트
- TC-026: 페이지 최소값 (1)
  - 입력: page: 1
  - 예상: 200 OK
- TC-027: 페이지 음수 값 (-1)
  - 입력: page: -1
  - 예상: 400 Bad Request
- TC-028: limit 최대값 (100)
  - 입력: limit: 100
  - 예상: 200 OK
- TC-029: limit 초과 값 (101)
  - 입력: limit: 101
  - 예상: 400 Bad Request

### 문서 ID 배열 경계 테스트
- TC-030: 빈 배열
  - 입력: documentIds: []
  - 예상: 400 Bad Request
- TC-031: 단일 문서 ID
  - 입력: documentIds: [1]
  - 예상: 201 Created
- TC-032: 다중 문서 ID (최대 10개)
  - 입력: documentIds: [1,2,3,4,5,6,7,8,9,10]
  - 예상: 201 Created

### 안전 점수 범위별 필터링 테스트
- TC-033: SAFE 필터 (안전 점수 80-100)
  - 입력: safetyScore: "SAFE"
  - 예상: 해당 범위의 리포트만 반환
- TC-034: CAUTION 필터 (안전 점수 60-79)
  - 입력: safetyScore: "CAUTION"
  - 예상: 해당 범위의 리포트만 반환
- TC-035: DANGER 필터 (안전 점수 0-59)
  - 입력: safetyScore: "DANGER"
  - 예상: 해당 범위의 리포트만 반환
