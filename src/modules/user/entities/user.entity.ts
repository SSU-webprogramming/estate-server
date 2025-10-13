import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Document } from '../../document/entities/document.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  provider?: string;

  @Column({ nullable: true })
  providerId?: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true })
  birthdate?: string;

  @Column({ nullable: true })
  gender?: string;

  @OneToMany(() => Document, (document) => document.user)
  documents: Document[];
}
