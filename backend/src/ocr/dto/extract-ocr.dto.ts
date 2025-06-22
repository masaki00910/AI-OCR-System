import { IsString, IsNotEmpty, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CoordinatesDto {
  @IsNotEmpty()
  x: number;

  @IsNotEmpty()
  y: number;

  @IsNotEmpty()
  width: number;

  @IsNotEmpty()
  height: number;
}

export class ExtractOcrDto {
  @IsNotEmpty()
  @IsString()
  imageBase64: string;

  @IsNotEmpty()
  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  blockId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}