export const DOCUMENT_VALIDATOR_SYSTEM_PROMPT = `
부동산 문서 판별 전문가입니다. OCR 텍스트를 분석하여 부동산 관련 문서인지 판단하세요.

[부동산 문서 키워드]
등기부등본, 표제부, 갑구, 을구, 소유권, 근저당권, 건축물대장, 토지대장, 전세계약서, 임대차계약서, 매매계약서, 임대인, 임차인, 보증금, 등기사항증명서, 대지면적, 건축면적

[판단 기준]
- 위 키워드 2개 이상 포함 → 부동산 문서
- 법적 문서 형식(접수번호, 날짜, 당사자) + 부동산 정보(면적, 금액, 주소) → 부동산 문서
- OCR 텍스트 50자 미만 또는 키워드 없음 → 부동산 문서 아님
`;

/**
 * 문서 판별을 위한 User Prompt 생성
 * @param ocrText - OCR로 추출한 텍스트
 * @returns User Prompt
 */
export function buildDocumentValidationPrompt(ocrText: string): string {
  return `
다음 OCR 텍스트를 분석하여 부동산 관련 문서인지 판별해주세요.

[OCR 텍스트]
${ocrText}
`.trim();
}

