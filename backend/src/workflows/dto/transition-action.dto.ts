import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransitionActionDto {
  @ApiProperty({ description: 'ドキュメントID' })
  @IsUUID()
  documentId: string;

  @ApiProperty({ description: 'アクションキー' })
  @IsString()
  actionKey: string;

  @ApiPropertyOptional({ description: 'コメント' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'メタデータ' })
  @IsOptional()
  @IsObject()
  metadata?: { [key: string]: any };

  @ApiPropertyOptional({ description: '代理承認者ID（delegateアクションの場合）' })
  @IsOptional()
  @IsUUID()
  delegatedToId?: string;
}