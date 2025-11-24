import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Estate } from '../../estate/entities/estate.entity';

/**
 * 문서 타입
 */
export enum DocumentType {
  /** 등기부등본 */
  REGISTRY = '1',
  /** 토지대장 */
  LAND_REGISTER = '2',
}

/**
 * 문서 엔티티
 * 부동산 관련 문서(등기부등본, 토지대장 등) 정보를 저장
 */
@Entity('documents')
export class Document {
  /** 문서 ID (PK) */
  @PrimaryGeneratedColumn({ name: 'doc_id', type: 'bigint' })
  docId: number;

  /** 소속 부동산 ID (FK) */
  @Column({ name: 'estate_id', type: 'bigint', nullable: true })
  estateId: number | null;

  /** 소속 부동산 정보 */
  @ManyToOne(() => Estate, (estate) => estate.documents, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'estate_id' })
  estate: Estate | null;

  /** 문서 타입 (1: 등기부등본, 2: 토지대장) */
  @Column({
    name: 'doc_type',
    type: 'varchar',
    length: 50,
    enum: DocumentType,
  })
  docType: DocumentType;

  /** 문서 파일명 */
  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  /** S3 저장 키 */
  @Column({ name: 's3_key', type: 'varchar', length: 255 })
  s3Key: string;

  /** 파일 URL */
  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  /** 파일 MIME 타입 */
  @Column({ name: 'content_type', type: 'varchar', length: 100, nullable: true })
  contentType: string | null;

  /** 문서 순서 (기본값: 0) */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** OCR로 추출한 텍스트 */
  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText: string | null;

  /** 업로드 일시 */
  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploadedAt: Date;
}
