import { PutObjectCommandOutput } from '@aws-sdk/client-s3';

export abstract class S3Port {
  abstract upload(
    file: Buffer,
    key: string,
    mimetype: string,
  ): Promise<PutObjectCommandOutput>;

  abstract download(key: string): Promise<Buffer>;

  abstract downloadAsBase64(key: string): Promise<string>;
}
