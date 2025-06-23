import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateExportDto } from './dto/create-export.dto';
import { Export, ExportStatus } from '../entities/export.entity';

interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}

@Controller('api/v1/exports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post()
  async create(
    @Body() createExportDto: CreateExportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Export> {
    return this.exportsService.create(createExportDto, user);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: ExportStatus,
  ) {
    const filters = {
      tenantId: user.tenantId,
      status,
    };

    return this.exportsService.findAll(filters, { page, limit });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Export> {
    return this.exportsService.findOne(id, user.tenantId);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    try {
      const exportRecord = await this.exportsService.findOne(id, user.tenantId);
      
      if (exportRecord.status !== ExportStatus.COMPLETED) {
        throw new BadRequestException('エクスポートが完了していません');
      }

      const { stream, filename, mimeType } = await this.exportsService.getDownloadStream(exportRecord);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      stream.pipe(res);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'ダウンロードに失敗しました',
        error: error.message,
      });
    }
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.exportsService.remove(id, user.tenantId);
  }
}