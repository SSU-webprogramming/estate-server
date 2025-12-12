import { Document } from '@/modules/document/entities/document.entity';

export abstract class IDocumentRepository {
  abstract create(document: Partial<Document>): Document;

  abstract save(document: Document): Promise<Document>;
  abstract save(documents: Document[]): Promise<Document[]>;
  abstract save(document: Document | Document[]): Promise<Document | Document[]>;

  abstract findOne(docId: number): Promise<Document | null>;

  abstract findByUserId(userId: number): Promise<Document[]>;

  abstract findByIds(documentIds: number[]): Promise<Document[]>;

  abstract findUnlinked(): Promise<Document[]>;

  abstract delete(docIds: number[]): Promise<void>;
}
