import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SaveRecordsDto } from './dto/save-records.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { Document, DocumentStatus } from '../entities/document.entity';
import { Record } from '../entities/record.entity';
import { Extraction } from '../entities/extraction.entity';

@ApiTags('documents')
@Controller('api/v1/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'ドキュメントをアップロード' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'templateId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'アップロードするファイル（PDF/PNG/JPEG）',
        },
        templateId: {
          type: 'string',
          format: 'uuid',
          description: 'テンプレートID',
        },
        metadata: {
          type: 'object',
          description: '追加メタデータ（オプション）',
        },
      },
    },
  })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: User,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentsService.create(
      createDocumentDto,
      file,
      user.id,
      user.tenantId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'ドキュメント一覧を取得' })
  async findAll(
    @CurrentUser() user: User,
    @Query('templateId') templateId?: string,
    @Query('status') status?: DocumentStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ documents: Document[]; total: number }> {
    const options = {
      templateId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.documentsService.findAll(user.tenantId, options);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ドキュメントの詳細を取得' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Document> {
    return this.documentsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'ドキュメント情報を更新' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: User,
  ): Promise<Document> {
    return this.documentsService.update(
      id,
      updateDocumentDto,
      user.id,
      user.tenantId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ドキュメントを削除' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.documentsService.delete(id, user.id, user.tenantId);
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'ドキュメントのデータ（レコード）を取得' })
  async getData(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Record[]> {
    return this.documentsService.getDocumentData(id, user.tenantId);
  }

  @Put(':id/data')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'ドキュメントのデータ（レコード）を保存' })
  async saveData(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() saveRecordsDto: SaveRecordsDto,
    @CurrentUser() user: User,
  ): Promise<Record[]> {
    return this.documentsService.saveDocumentData(
      id,
      saveRecordsDto,
      user.id,
      user.tenantId,
    );
  }

  @Post(':id/approve')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ドキュメントを承認' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Document> {
    return this.documentsService.approve(id, user.id, user.tenantId);
  }

  @Get(':id/extractions')
  @ApiOperation({ summary: 'ドキュメントの抽出結果を取得' })
  async getExtractions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Extraction[]> {
    return this.documentsService.getExtractions(id, user.tenantId);
  }

  @Get(':id/pages/:page')
  @ApiOperation({ summary: 'ドキュメントのページ画像を取得' })
  async getPageImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('page') page: string,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<StreamableFile> {
    
    const pageNo = parseInt(page, 10);
    if (isNaN(pageNo) || pageNo < 1) {
      throw new BadRequestException('Invalid page number');
    }

    const result = await this.documentsService.getPageImage(id, pageNo, user.tenantId);
    
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `inline; filename="page_${pageNo}.png"`,
    });

    return new StreamableFile(result.buffer);
  }
}