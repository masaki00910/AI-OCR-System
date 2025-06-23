import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { Export, ExportFormat, ExportStatus } from '../entities/export.entity';
import { Document } from '../entities/document.entity';
import { Extraction } from '../entities/extraction.entity';
import { CreateExportDto } from './dto/create-export.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}

interface ExportFilters {
  tenantId: string;
  status?: ExportStatus;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @InjectRepository(Export)
    private readonly exportRepository: Repository<Export>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Extraction)
    private readonly extractionRepository: Repository<Extraction>,
  ) {}

  async create(createExportDto: CreateExportDto, user: AuthenticatedUser): Promise<Export> {
    const exportRecord = this.exportRepository.create({
      format: createExportDto.format,
      templateId: createExportDto.templateId,
      filterJson: createExportDto.filterJson || {},
      tenantId: user.tenantId,
      createdById: user.id,
      status: ExportStatus.PENDING,
    });

    const savedExport = await this.exportRepository.save(exportRecord);

    // 非同期でエクスポート処理を開始
    this.processExport(savedExport).catch((error) => {
      this.logger.error(`エクスポート処理エラー: ${savedExport.id}`, error);
    });

    return savedExport;
  }

  async findAll(filters: ExportFilters, pagination: PaginationOptions) {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const queryBuilder = this.exportRepository
      .createQueryBuilder('export')
      .leftJoinAndSelect('export.template', 'template')
      .leftJoinAndSelect('export.createdBy', 'user')
      .where('export.tenantId = :tenantId', { tenantId: filters.tenantId });

    if (filters.status) {
      queryBuilder.andWhere('export.status = :status', { status: filters.status });
    }

    const [exports, total] = await queryBuilder
      .orderBy('export.createdAt', 'DESC')
      .offset(offset)
      .limit(limit)
      .getManyAndCount();

    return {
      data: exports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<Export> {
    const exportRecord = await this.exportRepository.findOne({
      where: { id, tenantId },
      relations: ['template', 'createdBy'],
    });

    if (!exportRecord) {
      throw new NotFoundException('エクスポートが見つかりません');
    }

    return exportRecord;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const exportRecord = await this.findOne(id, tenantId);

    // ファイルも削除
    if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
      fs.unlinkSync(exportRecord.filePath);
    }

    await this.exportRepository.remove(exportRecord);
  }

  async getDownloadStream(exportRecord: Export): Promise<{
    stream: Readable;
    filename: string;
    mimeType: string;
  }> {
    if (!exportRecord.filePath || !fs.existsSync(exportRecord.filePath)) {
      // テストデータの場合、仮のCSVファイルを生成
      this.logger.warn(`ファイルが見つかりません: ${exportRecord.filePath}. ダミーファイルを生成します。`);
      
      const exportDir = process.env.EXPORT_DIR || '/tmp/exports';
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `export_${exportRecord.format}_${timestamp}.${exportRecord.format.toLowerCase()}`;
      const filePath = path.join(exportDir, filename);
      
      // ダミーデータを生成
      await this.generateDummyFile(exportRecord, filePath);
      
      // DBを更新
      await this.exportRepository.update(exportRecord.id, { filePath });
      
      const stream = fs.createReadStream(filePath);
      const mimeType = this.getMimeType(exportRecord.format);
      return { stream, filename, mimeType };
    }

    const stream = fs.createReadStream(exportRecord.filePath);
    const filename = path.basename(exportRecord.filePath);
    const mimeType = this.getMimeType(exportRecord.format);

    return { stream, filename, mimeType };
  }

  private async generateDummyFile(exportRecord: Export, filePath: string): Promise<void> {
    // 実際のドキュメントデータを取得
    const documents = await this.getExportData(exportRecord);
    
    switch (exportRecord.format) {
      case ExportFormat.CSV:
        await this.generateCSV(documents, filePath);
        break;
      case ExportFormat.JSON:
        await this.generateJSON(documents, filePath);
        break;
      case ExportFormat.XML:
        await this.generateXML(documents, filePath);
        break;
      default:
        throw new BadRequestException(`サポートされていない形式: ${exportRecord.format}`);
    }
  }

  private async processExport(exportRecord: Export): Promise<void> {
    try {
      this.logger.log(`エクスポート処理開始: ${exportRecord.id}`);
      
      // ステータスを処理中に更新
      await this.exportRepository.update(exportRecord.id, {
        status: ExportStatus.PROCESSING,
      });

      // ドキュメントデータを取得
      const documents = await this.getExportData(exportRecord);
      
      // ファイル生成
      const filePath = await this.generateExportFile(exportRecord, documents);
      const fileSize = fs.statSync(filePath).size;

      // 完了ステータスに更新
      await this.exportRepository.update(exportRecord.id, {
        status: ExportStatus.COMPLETED,
        filePath,
        fileSize,
        completedAt: new Date(),
      });

      this.logger.log(`エクスポート処理完了: ${exportRecord.id}`);
    } catch (error) {
      this.logger.error(`エクスポート処理失敗: ${exportRecord.id}`, error);
      
      await this.exportRepository.update(exportRecord.id, {
        status: ExportStatus.ERROR,
        errorMessage: error.message,
      });
    }
  }

  private async getExportData(exportRecord: Export): Promise<any[]> {
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.extractions', 'extraction')
      .leftJoinAndSelect('document.template', 'template')
      .where('document.tenantId = :tenantId', { tenantId: exportRecord.tenantId });

    // フィルター適用
    if (exportRecord.templateId) {
      queryBuilder.andWhere('document.templateId = :templateId', {
        templateId: exportRecord.templateId,
      });
    }

    if (exportRecord.filterJson.startDate) {
      queryBuilder.andWhere('document.createdAt >= :startDate', {
        startDate: new Date(exportRecord.filterJson.startDate),
      });
    }

    if (exportRecord.filterJson.endDate) {
      queryBuilder.andWhere('document.createdAt <= :endDate', {
        endDate: new Date(exportRecord.filterJson.endDate),
      });
    }

    if (exportRecord.filterJson.status && exportRecord.filterJson.status.length > 0) {
      queryBuilder.andWhere('document.status IN (:...statuses)', {
        statuses: exportRecord.filterJson.status,
      });
    }

    return await queryBuilder.getMany();
  }

  private async generateExportFile(exportRecord: Export, documents: any[]): Promise<string> {
    const exportDir = process.env.EXPORT_DIR || '/tmp/exports';
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `export_${exportRecord.format}_${timestamp}.${exportRecord.format.toLowerCase()}`;
    const filePath = path.join(exportDir, filename);

    switch (exportRecord.format) {
      case ExportFormat.CSV:
        await this.generateCSV(documents, filePath);
        break;
      case ExportFormat.JSON:
        await this.generateJSON(documents, filePath);
        break;
      case ExportFormat.XML:
        await this.generateXML(documents, filePath);
        break;
      default:
        throw new BadRequestException(`サポートされていない形式: ${exportRecord.format}`);
    }

    return filePath;
  }

  private async generateCSV(documents: any[], filePath: string): Promise<void> {
    const headers = ['ID', 'ファイル名', 'ステータス', 'テンプレート', '作成日', '抽出データ'];
    const rows = [headers.join(',')];

    for (const doc of documents) {
      const extractionData = doc.extractions
        .map((ext: any) => JSON.stringify(ext.extractedData))
        .join(';');
      
      const row = [
        doc.id,
        `"${doc.fileName}"`,
        doc.status,
        doc.template?.name || '',
        doc.createdAt.toISOString(),
        `"${extractionData}"`
      ];
      rows.push(row.join(','));
    }

    fs.writeFileSync(filePath, rows.join('\n'), 'utf8');
  }

  private async generateJSON(documents: any[], filePath: string): Promise<void> {
    const exportData = {
      exportedAt: new Date().toISOString(),
      count: documents.length,
      documents: documents.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        status: doc.status,
        template: doc.template?.name,
        createdAt: doc.createdAt,
        extractions: doc.extractions.map((ext: any) => ({
          id: ext.id,
          blockId: ext.blockId,
          extractedData: ext.extractedData,
          createdAt: ext.createdAt,
        })),
      })),
    };

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
  }

  private async generateXML(documents: any[], filePath: string): Promise<void> {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';
    xml += `  <exportedAt>${new Date().toISOString()}</exportedAt>\n`;
    xml += `  <count>${documents.length}</count>\n`;
    xml += '  <documents>\n';

    for (const doc of documents) {
      xml += '    <document>\n';
      xml += `      <id>${doc.id}</id>\n`;
      xml += `      <fileName><![CDATA[${doc.fileName}]]></fileName>\n`;
      xml += `      <status>${doc.status}</status>\n`;
      xml += `      <template><![CDATA[${doc.template?.name || ''}]]></template>\n`;
      xml += `      <createdAt>${doc.createdAt.toISOString()}</createdAt>\n`;
      xml += '      <extractions>\n';
      
      for (const ext of doc.extractions) {
        xml += '        <extraction>\n';
        xml += `          <id>${ext.id}</id>\n`;
        xml += `          <blockId>${ext.blockId || ''}</blockId>\n`;
        xml += `          <extractedData><![CDATA[${JSON.stringify(ext.extractedData)}]]></extractedData>\n`;
        xml += `          <createdAt>${ext.createdAt.toISOString()}</createdAt>\n`;
        xml += '        </extraction>\n';
      }
      
      xml += '      </extractions>\n';
      xml += '    </document>\n';
    }

    xml += '  </documents>\n';
    xml += '</export>';

    fs.writeFileSync(filePath, xml, 'utf8');
  }

  private getMimeType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.CSV:
        return 'text/csv';
      case ExportFormat.JSON:
        return 'application/json';
      case ExportFormat.XML:
        return 'application/xml';
      case ExportFormat.XLSX:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ExportFormat.PDF:
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}