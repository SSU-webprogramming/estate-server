import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { AnalysisResult } from '../../analysis-result/entities/analysis-result.entity';
import { Document } from '../../document/entities/document.entity';
import { ContractType } from './contract-type.enum';

/**
 * 부동산 엔티티
 * 사용자가 등록한 부동산 정보를 관리
 */
@Entity('estates')
export class Estate {
  /** 부동산 ID (PK) */
  @PrimaryGeneratedColumn({ name: 'estate_id', type: 'bigint' })
  estateId: number;

  /** 소유자 사용자 ID (FK) */
  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  /** 소유자 사용자 정보 */
  @ManyToOne(() => User, (user) => user.estates)
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** 주소 */
  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address: string | null;

  /** 상세 주소 */
  @Column({ name: 'address_detail', type: 'varchar', length: 100, nullable: true })
  addressDetail: string | null;

  /** 계약 타입 (전세, 월세 등) */
  @Column({
    name: 'contract_type',
    type: 'varchar',
    length: 20,
    nullable: true,
    enum: ContractType,
  })
  contractType: ContractType | null;

  /** 보증금 (기본값: 0) */
  @Column({ type: 'bigint', default: 0 })
  deposit: number;

  /** 월세 (기본값: 0) */
  @Column({ name: 'monthly_rent', type: 'bigint', default: 0 })
  monthlyRent: number;

  /** KB 시세 (기본값: 0) */
  @Column({ name: 'kb_market_price', type: 'bigint', default: 0 })
  kbMarketPrice: number;

  /** 생성 일시 */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  /** 수정 일시 */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  /** 부동산 분석 결과 목록 */
  @OneToMany(() => AnalysisResult, (analysisResult) => analysisResult.estate)
  analysisResults: AnalysisResult[];

  /** 부동산 관련 문서 목록 */
  @OneToMany(() => Document, (document) => document.estate)
  documents: Document[];
}

