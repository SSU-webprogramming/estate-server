import { Observable } from 'rxjs';

export interface FileWithMimeType {
  buffer: Buffer;
  mimeType: string;
}

export abstract class TextGeneratorPort {
  abstract generateTextFromImage(
    systemPrompt: string,
    userPrompt: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string>;

  abstract generateTextFromImageStream(
    systemPrompt: string,
    userPrompt: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Observable<string>;

  abstract generateTextFromImagesStream(
    systemPrompt: string,
    userPrompt: string,
    files: FileWithMimeType[],
  ): Observable<string>;
}
