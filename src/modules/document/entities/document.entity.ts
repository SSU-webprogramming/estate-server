import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id, { eager: false })
  user: User;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  s3Path: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADED,
  })
  status: DocumentStatus;

  @Column({ type: 'text', nullable: true })
  analysisResult: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
