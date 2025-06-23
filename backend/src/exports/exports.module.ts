import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { Export } from '../entities/export.entity';
import { Document } from '../entities/document.entity';
import { Extraction } from '../entities/extraction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Export, Document, Extraction]),
  ],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}