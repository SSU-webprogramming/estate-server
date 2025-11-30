import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Estate } from '../../estate/entities/estate.entity';

/**
 * OAuth 제공자 타입
 */
export enum ProviderType {
  /** 카카오 */
  KAKAO = '1',
}

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

  /** 이메일 주소 (고유값) */
  @Column({ 
    name: 'email',
    type: 'varchar', 
    length: 255, 
    unique: true,
    comment: '이메일 주소'
  })
  email: string;

  /** 사용자명 */
  @Column({ 
    name: 'username',
    type: 'varchar', 
    length: 100, 
    nullable: true,
    comment: '사용자명'
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
}
