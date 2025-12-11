import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { Document } from '@/modules/document/entities/document.entity';
import { ContractType } from '@/common/enums/contract-type.enum';

@Entity('estates')
export class Estate {
  @PrimaryGeneratedColumn({ 
    name: 'estate_id', 
    type: 'bigint',
    comment: '부동산 ID (PK)'
  })
  estateId: number;

  @Column({ 
    name: 'user_id', 
    type: 'bigint',
    comment: '소유자 사용자 ID (FK)'
  })
  userId: number;

  @ManyToOne(() => User, (user) => user.estates)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ 
    name: 'address', 
    type: 'varchar', 
    length: 255, 
    nullable: true,
    comment: '주소'
  })
  address: string | null;

  @Column({ 
    name: 'address_detail', 
    type: 'varchar', 
    length: 100, 
    nullable: true,
    comment: '상세 주소'
  })
  addressDetail: string | null;

  @Column({
    name: 'contract_type',
    type: 'varchar',
    length: 20,
    nullable: true,
    enum: ContractType,
    comment: '계약 타입 (전세, 월세 등)'
  })
  contractType: ContractType | null;

  @Column({ 
    name: 'deposit',
    type: 'bigint', 
    default: 0,
    comment: '보증금'
  })
  deposit: number;

  @Column({ 
    name: 'monthly_rent', 
    type: 'bigint', 
    default: 0,
    comment: '월세'
  })
  monthlyRent: number;

  @Column({ 
    name: 'kb_market_price', 
    type: 'bigint', 
    default: 0,
    comment: 'KB 시세'
  })
  kbMarketPrice: number;

  @CreateDateColumn({ 
    name: 'created_at', 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    comment: '생성 일시'
  })
  createdAt: Date;

  @UpdateDateColumn({ 
    name: 'updated_at', 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: '수정 일시'
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
    comment: '삭제 일시',
  })
  deletedAt: Date | null;

  @OneToOne(() => EstateAnalysisReport, (analysisResult) => analysisResult.estate)
  analysisResult: EstateAnalysisReport | null;

  @OneToMany(() => Document, (document) => document.estate)
  documents: Document[];
}