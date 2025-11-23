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
 * 분석 결과 엔티티
 * 부동산 문서 분석 결과를 관리
 */
@Entity('analysis_results')
export class AnalysisResult {
  /** 분석 결과 ID (PK) */
  @PrimaryGeneratedColumn({ name: 'result_id', type: 'bigint' })
  resultId: number;

  /** 분석 대상 부동산 ID (FK) */
  @Column({ name: 'estate_id', type: 'varchar', length: 36 })
  estateId: string;

  /** 분석 대상 부동산 정보 */
  @ManyToOne(() => Estate, (estate) => estate.analysisResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'estate_id' })
  estate: Estate;

  /** 분석 점수 */
  @Column({ name: 'analysis_score', type: 'int', nullable: true })
  analysisScore: number | null;

  /** 분석 일시 */
  @CreateDateColumn({ name: 'analyzed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  analyzedAt: Date;
}

