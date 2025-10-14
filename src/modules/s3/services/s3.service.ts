import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectCommandOutput,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Port } from '../../../common/ports/s3.port';
import { Readable } from 'stream';

@Injectable()
export class S3Service implements S3Port {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    if (
      !endpoint ||
      !region ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucketName
    ) {
      throw new Error('Missing AWS S3 configuration in .env file');
    }

    const s3Config: S3ClientConfig = {
      endpoint: endpoint,
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      forcePathStyle: true,
    };

    this.s3Client = new S3Client(s3Config);
    this.bucketName = bucketName;
  }

  async upload(
    file: Buffer,
    key: string,
    mimetype: string,
  ): Promise<PutObjectCommandOutput> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: mimetype,
    });

    try {
      return await this.s3Client.send(command);
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new InternalServerErrorException('Failed to upload file to S3.');
    }
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      const body = response.Body;

      if (!body) {
        throw new InternalServerErrorException('S3 object body is empty.');
      }

      // The body can be a stream in Node.js environment
      if (body instanceof Readable) {
        return new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          body.on('data', (chunk) => chunks.push(chunk));
          body.on('error', reject);
          body.on('end', () => resolve(Buffer.concat(chunks)));
        });
      }

      // Handle other body types if necessary (e.g., Blob in browser)
      // For this server-side app, we primarily expect a Readable stream.
      throw new InternalServerErrorException(
        'Unsupported S3 object body type.',
      );
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      throw new InternalServerErrorException(
        'Failed to download file from S3.',
      );
    }
  }

  async downloadAsBase64(key: string): Promise<string>{
    const buffer = await this.download(key);
    return buffer.toString('base64');
  }
}
