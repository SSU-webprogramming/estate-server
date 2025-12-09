import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 약관 엔티티
 * 서비스 이용 약관 정보를 관리
 */
@Entity('terms')
export class Term {
  /** 약관 ID (PK) */
  @PrimaryGeneratedColumn({
    name: 'term_id',
    type: 'bigint',
    comment: '약관 ID (PK)',
  })
  id: number;

  /** 약관 제목 */
  @Column({
    name: 'title',
    type: 'varchar',
    length: 255,
    comment: '약관 제목',
  })
  title: string;

  /** 약관 내용 */
  @Column({
    name: 'content',
    type: 'text',
    comment: '약관 내용',
  })
  content: string;

  /** 필수 여부 */
  @Column({
    name: 'is_required',
    type: 'boolean',
    default: false,
    comment: '필수 여부',
  })
  isRequired: boolean;

  /** 생성 일시 */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '생성 일시',
  })
  createdAt: Date;

  /** 수정 일시 */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: '수정 일시',
  })
  updatedAt: Date;
}