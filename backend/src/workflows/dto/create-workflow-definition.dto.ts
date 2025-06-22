import { IsString, IsOptional, IsNumber, IsObject, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkflowDefinitionDto {
  @ApiProperty({ description: 'ワークフロー名' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'ワークフロー説明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'バージョン番号', default: 1 })
  @IsOptional()
  @IsNumber()
  version?: number;

  @ApiPropertyOptional({ description: 'ワークフロー図のJSON定義' })
  @IsOptional()
  @IsObject()
  graphJson?: { [key: string]: any };

  @ApiPropertyOptional({ description: 'アクティブフラグ', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}