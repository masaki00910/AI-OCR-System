import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '../../entities/document.entity';

export class UpdateDocumentDto {
  @ApiProperty({ description: 'ドキュメントステータス', enum: DocumentStatus, required: false })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiProperty({ description: 'メタデータ', required: false })
  @IsObject()
  @IsOptional()
  metadata?: { [key: string]: any };
}