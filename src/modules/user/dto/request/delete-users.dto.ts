import { IsArray, IsNumber, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteUsersDto {
  @ApiProperty({
    description: '삭제할 사용자 ID 목록',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty({ message: '삭제할 사용자 ID는 최소 1개 이상 필요합니다.' })
  @IsNumber({}, { each: true, message: '사용자 ID는 숫자여야 합니다.' })
  userIds: number[];
}
