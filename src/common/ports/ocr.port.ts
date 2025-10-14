export abstract class OcrPort {
  abstract extractTextFromBase64Images(
    base64Images: Array<{ base64: string; mimeType: string; name: string }>,
  ): Promise<string>;
}
