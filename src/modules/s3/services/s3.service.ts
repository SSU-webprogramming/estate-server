import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  PutObjectCommandOutput,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Port } from '@/common/ports/s3.port';
import { Readable } from 'stream';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';

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
      throw new CustomException(ErrorCode.S3_CONFIG_ERROR);
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
      throw new CustomException(ErrorCode.S3_UPLOAD_FAILED);
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
        throw new CustomException(ErrorCode.S3_FILE_NOT_FOUND);
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

      throw new CustomException(ErrorCode.S3_DOWNLOAD_FAILED);
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      if (error instanceof CustomException) {
        throw error;
      }
      throw new CustomException(ErrorCode.S3_DOWNLOAD_FAILED);
    }
  }

  async downloadAsBase64(key: string): Promise<string>{
    const buffer = await this.download(key);
    return buffer.toString('base64');
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new CustomException(ErrorCode.S3_DELETE_FAILED);
    }
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error copying file in S3:', error);
      throw new CustomException(ErrorCode.S3_UPLOAD_FAILED);
    }
  }
}