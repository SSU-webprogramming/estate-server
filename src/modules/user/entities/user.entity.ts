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
 * OAuth ??? ??
 */
export enum ProviderType {
  /** ??? */
  KAKAO = '1',
}

/**
 * ??? ???
 * OAuth? ?? ?? ??? ??? ??? ??
 */
@Entity('users')
export class User {
  /** ??? ID (PK) */
  @PrimaryGeneratedColumn({ name: 'user_id', type: 'bigint' })
  userId: number;

  /** ??? ?? (???) */
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  /** ???? */
  @Column({ type: 'varchar', length: 100, nullable: true })
  username: string | null;

  /** OAuth ??? ?? (1: ???) */
  @Column({
    name: 'provider_type',
    type: 'varchar',
    length: 50,
    nullable: true,
    enum: ProviderType,
  })
  providerType: ProviderType | null;

  /** OAuth ????? ??? ??? ID */
  @Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
  providerId: string | null;

  /** ??? ?? (???: 'USER') */
  @Column({ type: 'varchar', length: 20, default: 'USER' })
  role: string;

  /** ?? ?? */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  /** ?? ?? */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  /** ???? ??? ??? ?? */
  @OneToMany(() => Estate, (estate) => estate.user)
  estates: Estate[];
}
