import { IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartApprovalDto {
  @ApiProperty({ description: 'ドキュメントID' })
  @IsUUID()
  documentId: string;

  @ApiProperty({ description: 'ワークフローID' })
  @IsUUID()
  workflowId: string;

  @ApiPropertyOptional({ description: 'メタデータ（優先度、金額など）' })
  @IsOptional()
  @IsObject()
  metadata?: { [key: string]: any };
}