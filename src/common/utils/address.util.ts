/**
 * 주소 관련 유틸리티 함수
 * 주소 정규화 및 비교를 위한 헬퍼 함수 제공
 */

/**
 * 주소를 정규화하여 비교 가능한 형태로 변환
 * - 공백 제거
 * - 특수문자 제거
 * - 소문자 변환
 * - 불필요한 단위 제거 (번지, 호, 동 등)
 * 
 * @param address 원본 주소
 * @returns 정규화된 주소
 * 
 * @example
 * normalizeAddress('서울특별시 강남구 테헤란로 123번지') 
 * // => '서울강남구테헤란로123'
 */
export function normalizeAddress(address: string | null | undefined): string {
  if (!address) {
    return '';
  }

  return address
    .trim()
    // 공백 제거
    .replace(/\s+/g, '')
    // 특수문자 제거 (한글, 영문, 숫자만 남김)
    .replace(/[^\w\uAC00-\uD7A3]/g, '')
    // 불필요한 단위 제거
    .replace(/번지|번|호|동|층|건물|아파트|빌라|빌딩/g, '')
    // 소문자 변환
    .toLowerCase();
}

/**
 * 두 주소의 유사도를 계산 (Levenshtein Distance 알고리즘)
 * 
 * @param address1 첫 번째 주소
 * @param address2 두 번째 주소
 * @returns 유사도 (0~1 사이, 1에 가까울수록 유사)
 */
export function calculateAddressSimilarity(
  address1: string,
  address2: string,
): number {
  const normalized1 = normalizeAddress(address1);
  const normalized2 = normalizeAddress(address2);

  if (normalized1 === normalized2) {
    return 1.0;
  }

  if (!normalized1 || !normalized2) {
    return 0.0;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  return 1 - distance / maxLength;
}

/**
 * Levenshtein Distance 계산 (편집 거리)
 * 두 문자열 간의 최소 편집 거리를 계산
 * 
 * @param str1 첫 번째 문자열
 * @param str2 두 번째 문자열
 * @returns 편집 거리
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // DP 테이블 생성
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // 초기화
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  // DP 계산
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // 삭제
        dp[i][j - 1] + 1, // 삽입
        dp[i - 1][j - 1] + cost, // 교체
      );
    }
  }

  return dp[len1][len2];
}

/**
 * 두 주소가 유사한지 판단
 * 
 * @param address1 첫 번째 주소
 * @param address2 두 번째 주소
 * @param threshold 유사도 임계값 (기본값: 0.85)
 * @returns 유사 여부
 */
export function areAddressesSimilar(
  address1: string,
  address2: string,
  threshold: number = 0.85,
): boolean {
  const similarity = calculateAddressSimilarity(address1, address2);
  return similarity >= threshold;
}

