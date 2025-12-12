import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Document } from '@/modules/document/entities/document.entity';

@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(Document)
    private readonly repository: Repository<Document>,
  ) {}

  create(document: Partial<Document>): Document {
    return this.repository.create(document);
  }

  async save(document: Document): Promise<Document>;
  async save(documents: Document[]): Promise<Document[]>;
  async save(document: Document | Document[]): Promise<Document | Document[]> {
    if (Array.isArray(document)) {
      return this.repository.save(document);
    }
    return this.repository.save(document);
  }

  async findOne(docId: number): Promise<Document | null> {
    return this.repository.findOne({
      where: { docId },
    });
  }

  async findByUserId(userId: number): Promise<Document[]> {
    return this.repository.find({
      where: { userId },
      order: { uploadedAt: 'DESC' },
    });
  }

  async findByIds(documentIds: number[]): Promise<Document[]> {
    return this.repository.find({
      where: { docId: In(documentIds) },
    });
  }

  async findUnlinked(): Promise<Document[]> {
    return this.repository.find({
      where: { estateId: IsNull() },
    });
  }

  async delete(docIds: number[]): Promise<void> {
    await this.repository.delete({
      docId: In(docIds),
    });
  }
}

