/**
 * 분석 결과 상태 Enum
 * 등기부등본 각 구(표제부, 갑구, 을구)의 분석 결과 상태를 나타냄
 */
export enum AnalysisResultStatus {
    /** 안전 */
    안전 = 'SAFE',
    /** 주의 */
    주의 = 'CAUTION',
    /** 위험 */
    위험 = 'DANGER',
    /** 확인 불가 */
    확인불가 = 'UNKNOWN',
  }
  