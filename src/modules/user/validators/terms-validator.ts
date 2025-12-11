import { Injectable } from '@nestjs/common';
import { TermService } from '@/modules/term/term.service';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { TermResponseDto } from '@/modules/term/dto/response/term-response.dto';

/**
 * 약관 비즈니스 검증을 담당하는 클래스
 * 단일 책임 원칙(SRP)에 따라 약관 관련 비즈니스 로직 검증만 담당
 * 
 * Note: 약관 형식 검증은 DTO의 @IsValidAgreedTerms 데코레이터에서 처리됩니다.
 */
@Injectable()
export class TermsValidator {
  constructor(private readonly termService: TermService) {}

  /**
   * 동의한 약관이 필수 약관을 모두 포함하는지 검증
   * @param agreedTerms 사용자가 동의한 약관 목록
   * @throws CustomException 필수 약관이 누락된 경우
   */
  async validateRequiredTerms(agreedTerms: Record<string, boolean>): Promise<void> {
    const terms = await this.termService.findAll();
    const requiredTermIds = this.extractRequiredTermIds(terms);
    const agreedTermIds = this.extractAgreedTermIds(agreedTerms);

    const hasAllRequiredTerms = requiredTermIds.every((id) =>
      agreedTermIds.includes(id),
    );

    if (!hasAllRequiredTerms) {
      throw new CustomException(ErrorCode.TERMS_NOT_AGREED);
    }
  }

  /**
   * 사용자가 이미 약관에 동의했는지 확인
   * @param existingAgreedTerms 기존 약관 동의 내역
   * @throws CustomException 이미 동의한 경우
   */
  validateNotAlreadyAgreed(existingAgreedTerms: Record<string, boolean> | null): void {
    if (existingAgreedTerms && Object.keys(existingAgreedTerms).length > 0) {
      throw new CustomException(ErrorCode.TERMS_ALREADY_AGREED);
    }
  }

  /**
   * 약관 목록에서 필수 약관 ID 목록 추출
   */
  private extractRequiredTermIds(terms: TermResponseDto[]): number[] {
    return terms
      .filter((term) => term.isRequired)
      .map((term) => Number(term.id));
  }

  /**
   * 동의한 약관 ID 목록 추출
   */
  private extractAgreedTermIds(agreedTerms: Record<string, boolean>): number[] {
    return Object.entries(agreedTerms)
      .filter(([_, isAgreed]) => isAgreed)
      .map(([termId]) => Number(termId));
  }
}

