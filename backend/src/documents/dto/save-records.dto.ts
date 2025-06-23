import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordDto {
  @ApiProperty({ description: 'テーブルグループID（同じ種類のテーブルを識別）' })
  @IsString()
  @IsOptional()
  tableGroupId?: string;

  @ApiProperty({ description: 'フィールド名' })
  @IsString()
  fieldName: string;

  @ApiProperty({ description: 'フィールド値' })
  @IsString()
  @IsOptional()
  fieldValue?: string;

  @ApiProperty({ description: 'フィールドタイプ' })
  @IsString()
  @IsOptional()
  fieldType?: string;

  @ApiProperty({ description: 'テーブル内の行番号' })
  @IsInt()
  @Min(0)
  @IsOptional()
  rowIndex?: number;

  @ApiProperty({ description: 'メタデータ', required: false })
  @IsObject()
  @IsOptional()
  metadata?: { [key: string]: any };
}

export class SaveRecordsDto {
  @ApiProperty({ 
    description: 'レコード配列',
    type: [RecordDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordDto)
  records: RecordDto[];

  @ApiProperty({ 
    description: '既存レコードをすべて置き換えるか',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  replaceAll?: boolean;
}