import { Term } from '@/modules/term/entities/term.entity';
import { CreateTermDto } from '@/modules/term/dto/request/create-term.dto';
import { UpdateTermDto } from '@/modules/term/dto/request/update-term.dto';
import { TermResponseDto } from '@/modules/term/dto/response/term-response.dto';

export class TermMapper {
  static fromCreateDto(dto: CreateTermDto): Partial<Term> {
    return {
      title: dto.title,
      content: dto.content,
      isRequired: dto.isRequired,
    };
  }

  static fromUpdateDto(dto: UpdateTermDto): Partial<Term> {
    const updateData: Partial<Term> = {};
    
    if (dto.title) {
      updateData.title = dto.title;
    }
    if (dto.content) {
      updateData.content = dto.content;
    }
    if (dto.isRequired !== undefined) {
      updateData.isRequired = dto.isRequired;
    }
    
    return updateData;
  }

  static toResponseDto(term: Term): TermResponseDto {
    const dto = new TermResponseDto();
    dto.id = term.id;
    dto.title = term.title;
    dto.content = term.content;
    dto.isRequired = term.isRequired;
    dto.createdAt = term.createdAt;
    dto.updatedAt = term.updatedAt;
    return dto;
  }

  static toResponseDtoList(terms: Term[]): TermResponseDto[] {
    return terms.map((term) => this.toResponseDto(term));
  }
}
