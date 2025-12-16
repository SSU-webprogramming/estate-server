import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { User } from '@/modules/user/entities/user.entity';
import { DocumentType } from '@/common/enums/document-type.enum';

/**
 * 문서 엔티티
 * 부동산 관련 문서(등기부등본, 토지대장 등) 정보를 저장
 */
@Entity('documents')
export class Document {
  /** 문서 ID (PK) */
  @PrimaryGeneratedColumn({ 
    name: 'doc_id', 
    type: 'bigint',
    comment: '문서 ID (PK)'
  })
  docId: number;

  /** 소속 부동산 ID (FK) */
  @Column({ 
    name: 'estate_id', 
    type: 'bigint', 
    nullable: true,
    comment: '소속 부동산 ID (FK)'
  })
  estateId: number | null;

  /** 소속 부동산 정보 */
  @ManyToOne(() => Estate, (estate) => estate.documents, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'estate_id' })
  estate: Estate | null;

  /** 업로더 사용자 ID (FK) */
  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: true,
    comment: '업로더 사용자 ID (FK)'
  })
  userId: number | null;

  /** 업로더 사용자 정보 */
  @ManyToOne(() => User, (user) => user.documents, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /** 문서 타입 (1: 등기부등본, 2: 토지대장) */
  @Column({
    name: 'doc_type',
    type: 'varchar',
    length: 50,
    enum: DocumentType,
    comment: '문서 타입 (1: 등기부등본, 2: 토지대장)'
  })
  docType: DocumentType;

  /** 문서 파일명 */
  @Column({ 
    name: 'original_name', 
    type: 'varchar', 
    length: 255,
    comment: '문서 파일명'
  })
  originalName: string;

  /** S3 저장 키 */
  @Column({ 
    name: 's3_key', 
    type: 'varchar', 
    length: 255,
    comment: 'S3 저장 키'
  })
  s3Key: string;

  /** 파일 URL */
  @Column({ 
    name: 'file_url', 
    type: 'varchar', 
    length: 500, 
    nullable: true,
    comment: '파일 URL'
  })
  fileUrl: string | null;

  /** 파일 MIME 타입 */
  @Column({ 
    name: 'content_type', 
    type: 'varchar', 
    length: 100, 
    nullable: true,
    comment: '파일 MIME 타입'
  })
  contentType: string | null;

  /** 문서 순서 (기본값: 0) */
  @Column({ 
    name: 'sort_order', 
    type: 'int', 
    default: 0,
    comment: '문서 순서'
  })
  sortOrder: number;

  /** OCR로 추출한 텍스트 */
  @Column({ 
    name: 'extracted_text', 
    type: 'text', 
    nullable: true,
    comment: 'OCR로 추출한 텍스트'
  })
  extractedText: string | null;

  /** 부동산 문서 여부 (null: 미판별, true: 부동산 문서, false: 부동산 문서 아님) */
  @Column({
    name: 'is_real_estate_document',
    type: 'boolean',
    nullable: true,
    comment: '부동산 문서 여부 (null: 미판별, true: 부동산 문서, false: 부동산 문서 아님)'
  })
  isRealEstateDocument: boolean | null;

  /** 문서 판별 일시 */
  @Column({
    name: 'document_validated_at',
    type: 'timestamp',
    nullable: true,
    comment: '문서 판별 일시'
  })
  documentValidatedAt: Date | null;

  /** 업로드 일시 */
  @CreateDateColumn({ 
    name: 'uploaded_at', 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    comment: '업로드 일시'
  })
  uploadedAt: Date;

  /** 삭제 일시 */
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
    comment: '삭제 일시',
  })
  deletedAt: Date | null;
}