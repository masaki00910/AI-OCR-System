import { IsUUID, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const ToOptionalNumber = () => {
  return Transform(({ value }) => {
    // console.log('Raw templateId value:', value);
    // console.log('Type of templateId:', typeof value);
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    return typeof value === 'string' ? value.trim() : value;
  });
};

export class CreateDocumentDto {
  @ApiProperty({ description: 'テンプレートID' })
  @ToOptionalNumber()
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