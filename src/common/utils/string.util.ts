/**
 * 문자열 유틸리티 함수
 */

/**
 * 문자열이 비어있는지 확인 (null, undefined, 빈 문자열, 공백만 있는 문자열)
 * @param text 확인할 문자열
 * @returns 문자열이 비어있는 경우 true
 */
export function isEmpty(text: string | null | undefined): boolean {
  return text === null || text === undefined || text.trim() === '';
}

