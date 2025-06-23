import { IsEnum, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ExportFormat } from '../../entities/export.entity';

export class CreateExportDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsObject()
  filterJson?: { [key: string]: any };
}