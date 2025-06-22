import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class BlockDefinitionDto {
  @IsNotEmpty()
  @IsString()
  block_id: string;

  @IsNotEmpty()
  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsNotEmpty()
  @IsObject()
  schema: Record<string, any>;
}