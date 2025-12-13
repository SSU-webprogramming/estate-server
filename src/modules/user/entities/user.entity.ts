import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { Document } from '@/modules/document/entities/document.entity';
import { ProviderType } from '@/common/enums/provider-type.enum';
import { getEncryptionTransformer } from '@/common/utils/encryption.transformer';

/**
 * 사용자 엔티티
 * OAuth를 통한 소셜 로그인 사용자 정보를 관리
 */
@Entity('users')
export class User {
  /** 사용자 ID (PK) */
  @PrimaryGeneratedColumn({ 
    name: 'user_id', 
    type: 'bigint',
    comment: '사용자 ID (PK)'
  })
  userId: number;

  /** 이메일 주소 (고유값) - 암호화됨 */
  @Column({ 
    name: 'email',
    type: 'text',
    unique: true,
    comment: '이메일 주소 (암호화)',
    transformer: getEncryptionTransformer(),
  })
  email: string;

  /** 사용자명 - 암호화됨 */
  @Column({ 
    name: 'username',
    type: 'text',
    nullable: true,
    comment: '사용자명 (암호화)',
    transformer: getEncryptionTransformer(),
  })
  username: string | null;

  /** OAuth 제공자 타입 (1: 카카오) */
  @Column({
    name: 'provider_type',
    type: 'varchar',
    length: 50,
    nullable: true,
    enum: ProviderType,
    comment: 'OAuth 제공자 타입 (1: 카카오)'
  })
  providerType: ProviderType | null;

  /** OAuth 제공자에서 발급한 사용자 ID */
  @Column({ 
    name: 'provider_id', 
    type: 'varchar', 
    length: 255, 
    nullable: true,
    comment: 'OAuth 제공자에서 발급한 사용자 ID'
  })
  providerId: string | null;

  /** 사용자 역할 (기본값: 'USER') */
  @Column({ 
    name: 'role',
    type: 'varchar', 
    length: 20, 
    default: 'USER',
    comment: '사용자 역할'
  })
  role: string;

  /** 생성 일시 */
  @CreateDateColumn({ 
    name: 'created_at', 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    comment: '생성 일시'
  })
  createdAt: Date;

  /** 수정 일시 */
  @UpdateDateColumn({ 
    name: 'updated_at', 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: '수정 일시'
  })
  updatedAt: Date;

  /** 사용자가 소유한 부동산 목록 */
  @OneToMany(() => Estate, (estate) => estate.user)
  estates: Estate[];

  /** 사용자가 업로드한 문서 목록 */
  @OneToMany(() => Document, (document) => document.user)
  documents: Document[];

  /** 약관 동의 내역 (JSON) */
  @Column({
    name: 'agreed_terms',
    type: 'json',
    nullable: true,
    comment: '약관 동의 내역 (key: term_id, value: boolean)',
  })
  agreedTerms: Record<string, boolean> | null;

  /** 삭제 일시 */
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
    comment: '삭제 일시',
  })
  deletedAt: Date | null;
}
