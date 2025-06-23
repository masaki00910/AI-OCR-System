import { Injectable } from '@nestjs/common';
import * as Minio from 'minio';
import { Readable } from 'stream';
import { Logger } from '@nestjs/common';

@Injectable()
export class StorageService {
  private minioClient: Minio.Client;
  private bucketName = 'survey-pdfs';
  private region = 'us-east-1';
  private logger = new Logger(StorageService.name);

  constructor() {
    // 内部通信用のMinIOクライアント
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    this.initBucket();
  }

  private async initBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        this.logger.log(`Bucket ${this.bucketName} does not exist. Creating...`);
        await this.minioClient.makeBucket(this.bucketName, this.region);
        // console.log(`Bucket ${this.bucketName} created successfully`);

        // バケットポリシーを設定（パブリック読み取り可能）
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        
        await this.minioClient.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy)
        );
        // console.log(`Bucket policy set for ${this.bucketName}`);
        this.logger.log(`Bucket policy set for ${this.bucketName}`);
      } else {
        this.logger.log(`Bucket ${this.bucketName} already exists.`);
      }
    } catch (error) {
      console.error('Error creating bucket:', error);
    }
  }

  async uploadFile(
    objectName: string,
    stream: Readable,
    size: number,
    contentType: string,
  ): Promise<string> {
    await this.minioClient.putObject(
      this.bucketName,
      objectName,
      stream,
      size,
      { 'Content-Type': contentType },
    );
    return objectName;
  }

  async getFileUrl(objectName: string, expiry: number = 300): Promise<string> {
    // presignedURLを生成
    const url = await this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      expiry,
    );
    
    // Docker内部のホスト名をlocalhostに置換
    const publicUrl = url.replace(
      /https?:\/\/minio:9000/,
      'http://localhost:9000'
    );
    
    return publicUrl;
  }

  async deleteFile(objectName: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, objectName);
  }

  async getFileStream(objectName: string): Promise<Readable> {
    return await this.minioClient.getObject(this.bucketName, objectName);
  }

  async getFile(objectName: string): Promise<Buffer> {
    const stream = await this.minioClient.getObject(this.bucketName, objectName);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}