import { Observable } from 'rxjs';

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
}
