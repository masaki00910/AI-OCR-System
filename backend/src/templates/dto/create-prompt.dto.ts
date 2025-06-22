import { IsEnum, IsNotEmpty, IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { PromptRole } from '../../entities/prompt-template.entity';

export class CreatePromptDto {
  @IsOptional()
  @IsString()
  blockId?: string;

  @IsNotEmpty()
  @IsEnum(PromptRole)
  role: PromptRole;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sequenceOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}