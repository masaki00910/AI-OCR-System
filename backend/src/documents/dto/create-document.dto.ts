import { IsUUID, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ description: 'テンプレートID' })
  @Transform(({ value }) => {
    console.log('Raw templateId value:', value);
    console.log('Type of templateId:', typeof value);
    return typeof value === 'string' ? value.trim() : value;
  })
  // @IsUUID(4, { message: 'templateId must be a valid UUID' })  // 一時的に無効化
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: 'メタデータ', required: false })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value || {};
  })
  @IsObject()
  @IsOptional()
  metadata?: { [key: string]: any };
}