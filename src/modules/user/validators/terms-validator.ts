import { Injectable } from '@nestjs/common';
import { TermService } from '@/modules/term/service/term.service';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { TermResponseDto } from '@/modules/term/dto/response/term-response.dto';

/**
 * 약관 비즈니스 검증을 담당하는 클래스
 * 
 * Note: 약관 형식 검증은 DTO의 @IsValidAgreedTerms 데코레이터에서 처리됩니다.
 */
@Injectable()
export class TermsValidator {
  constructor(private readonly termService: TermService) {}

  async validateRequiredTerms(agreedTerms: Record<string, boolean>): Promise<void> {
    const terms = await this.termService.findAll();
    const requiredTermIds = this.extractRequiredTermIds(terms);
    const agreedTermIds = this.extractAgreedTermIds(agreedTerms);

    if (!this.hasAllRequiredTerms(requiredTermIds, agreedTermIds)) {
      throw new CustomException(ErrorCode.TERMS_NOT_AGREED);
    }
  }

  private hasAllRequiredTerms(requiredTermIds: number[], agreedTermIds: number[]): boolean {
    return requiredTermIds.every((id) => agreedTermIds.includes(id));
  }

  validateNotAlreadyAgreed(existingAgreedTerms: Record<string, boolean> | null): void {
    if (this.hasAgreedTerms(existingAgreedTerms)) {
      throw new CustomException(ErrorCode.TERMS_ALREADY_AGREED);
    }
  }

  private hasAgreedTerms(agreedTerms: Record<string, boolean> | null): boolean {
    return agreedTerms !== null && Object.keys(agreedTerms).length > 0;
  }

  private extractRequiredTermIds(terms: TermResponseDto[]): number[] {
    return terms
      .filter((term) => term.isRequired)
      .map((term) => Number(term.id));
  }

  private extractAgreedTermIds(agreedTerms: Record<string, boolean>): number[] {
    return Object.entries(agreedTerms)
      .filter(([_, isAgreed]) => isAgreed)
      .map(([termId]) => Number(termId));
  }
}

