import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { Template } from '../entities/template.entity';
import { PromptTemplate } from '../entities/prompt-template.entity';
import { Extraction } from '../entities/extraction.entity';
import { Page } from '../entities/page.entity';
import { Document } from '../entities/document.entity';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ExtractOcrDto } from './dto/extract-ocr.dto';
import * as sharp from 'sharp';
import { StorageService } from '../storage/storage.service';
import * as https from 'https';
import * as http from 'http';

export interface OCRRequest {
  imageBase64: string;
  templateId: string;
  pageId?: string;
  tableGroupId?: string;
  variables?: Record<string, any>;
}

export interface OCRResult {
  extractionId: string;
  content: Record<string, any>;
  confidence: number;
  validationErrors?: any[];
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private anthropic: Anthropic;
  private ajv: Ajv;
  private pythonOcrUrl: string;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(Extraction)
    private extractionRepository: Repository<Extraction>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    
    this.anthropic = new Anthropic({ apiKey });
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv); // Add support for date, time, email, etc. formats
    
    // Python OCRサービス用URL設定
    this.pythonOcrUrl = this.configService.get<string>('PYTHON_OCR_URL', 'http://localhost:8000');
    this.logger.log(`Python OCR service URL: ${this.pythonOcrUrl}`);
  }

  async performOcr(
    ocrRequest: OCRRequest,
    tenantId: string,
  ): Promise<OCRResult> {
    try {
      const { imageBase64, templateId, pageId, tableGroupId, variables } = ocrRequest;

      if (!imageBase64) {
        throw new HttpException('Image data is required', HttpStatus.BAD_REQUEST);
      }

      // テンプレートとプロンプトを取得
      const template = await this.templateRepository.findOne({
        where: { id: templateId, tenantId, isActive: true },
        relations: ['promptTemplates'],
      });

      if (!template) {
        throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
      }

      // プロンプトを生成
      const prompts = await this.generatePrompts(template, variables);
      
      // Claude APIを呼び出し
      this.logger.debug('Sending request to Claude API...');
      const message = await this.anthropic.messages.create({
        model: this.configService.get('CLAUDE_MODEL', 'claude-4-sonnet-20250514'),
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageBase64,
                },
              },
              ...prompts.map(prompt => ({
                type: 'text' as const,
                text: prompt,
              })),
            ],
          },
        ],
      });

      this.logger.debug('Received response from Claude API');

      // レスポンスからJSONを抽出
      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format');
      }

      let extractedData: any;
      extractedData = this.parseClaudeResponse(content.text, 'performOcr');

      // JSON Schemaでバリデーション
      const validationErrors = this.validateExtraction(extractedData, template.schemaJson);

      // 信頼度スコアを計算（バリデーションエラーに基づく）
      const confidence = validationErrors.length === 0 ? 0.95 : 0.7 - (validationErrors.length * 0.1);

      // pageIdが提供されない場合は、一時的なドキュメントとページを作成
      let actualPageId = pageId;
      if (!actualPageId) {
        // ダミードキュメントを作成
        const dummyDocument = await this.documentRepository.save({
          tenantId,
          templateId,
          fileName: 'ocr-direct-upload.tmp',
          storagePath: 'temp/ocr-direct',
          status: 'processing' as any,
          pageCount: 1,
          metadata: { source: 'direct-ocr' },
        });

        // ダミーページを作成
        const dummyPage = await this.pageRepository.save({
          documentId: dummyDocument.id,
          pageNo: 1,
          imagePath: null,
          ocrStatus: 'completed' as any,
        });
        actualPageId = dummyPage.id;
      }

      // 抽出結果を保存
      const extraction = await this.extractionRepository.save({
        pageId: actualPageId,
        content: extractedData,
        confidence: Math.max(0.1, Math.min(1.0, confidence)),
        modelName: 'claude-4-sonnet',
        promptUsed: `template_v${template.version}`,
      });

      return {
        extractionId: extraction.id,
        content: extractedData,
        confidence: extraction.confidence,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      };

    } catch (error) {
      this.logger.error('OCR Error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'OCR processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async generatePrompts(
    template: Template,
    variables?: Record<string, any>,
  ): Promise<string[]> {
    if (!template.promptTemplates?.length) {
      // デフォルトプロンプトを生成
      return [this.generateDefaultPrompt(template)];
    }

    // プロンプトテンプレートをソートして処理
    const sortedPrompts = template.promptTemplates
      .filter(p => p.isActive)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // 変数を準備
    const defaultVariables = {
      schema: JSON.stringify(template.schemaJson, null, 2),
      exampleJSON: JSON.stringify(this.generateExampleFromSchema(template.schemaJson), null, 2),
      fieldList: this.generateFieldListFromSchema(template.schemaJson),
    };

    const mergedVariables = { ...defaultVariables, ...variables };

    // 各プロンプトを処理
    return sortedPrompts.map(prompt => 
      this.processPlaceholders(prompt.content, mergedVariables)
    );
  }

  private generateDefaultPrompt(template: Template): string {
    const schema = JSON.stringify(template.schemaJson, null, 2);
    const example = JSON.stringify(this.generateExampleFromSchema(template.schemaJson), null, 2);

    return `
画像から情報を抽出して、以下のJSON Schema形式に従ってデータを出力してください。

期待するスキーマ:
${schema}

出力例:
${example}

注意事項：
- 数値は正確に読み取ってください
- 小数点以下の桁数も維持してください
- 空欄やハイフンは null として扱ってください
- 必ずJSON形式で出力してください（\`\`\`json と \`\`\` で囲む）
`;
  }

  private validateExtraction(
    data: any,
    schema: any,
  ): any[] {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);
    
    if (!valid) {
      return validate.errors || [];
    }
    
    return [];
  }

  private async saveExtraction(
    extractionData: Partial<Extraction>,
  ): Promise<Extraction> {
    const extraction = this.extractionRepository.create(extractionData);
    return await this.extractionRepository.save(extraction);
  }


  /**
   * Python OCRサービスを呼び出して手書き文字認識を実行
   */
  private async performPythonOcr(
    imageBase64: string,
    template: Template,
    block: any,
  ): Promise<{ extractedData: any; confidence: number }> {
    try {
      this.logger.debug('Calling Python OCR service for handwriting recognition');
      
      const requestData = {
        image: imageBase64,
        options: {
          block_id: block.block_id,
          block_label: block.label,
          template_id: template.id,
        }
      };

      const response = await this.makeHttpRequest('/api/v1/ocr/handwriting', 'POST', requestData);
      
      if (!response.success) {
        throw new Error(response.error || 'Python OCR service failed');
      }

      this.logger.debug(`Python OCR response: text="${response.text}", confidence=${response.confidence}`);

      // Python OCRサービスのレスポンスをフォーマット
      const extractedData = {
        text: response.text,
        confidence: response.confidence,
        digits: response.digits || [],
        boxes: response.boxes || [],
        processing_method: 'python_handwriting_ocr'
      };

      return {
        extractedData,
        confidence: response.confidence || 0.8
      };

    } catch (error) {
      this.logger.error('Python OCR service error:', error);
      
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        throw new HttpException(
          'Hand writing recognition service is temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
      
      throw new HttpException(
        `Handwriting recognition failed: ${error.message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  /**
   * Node.js標準ライブラリを使用したHTTPリクエスト
   */
  private async makeHttpRequest(path: string, method: string = 'GET', data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.pythonOcrUrl + path);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const requestData = data ? JSON.stringify(data) : undefined;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(requestData && { 'Content-Length': Buffer.byteLength(requestData) })
        },
        timeout: 30000 // 30秒タイムアウト
      };

      const req = httpModule.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (parseError) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (requestData) {
        req.write(requestData);
      }
      
      req.end();
    });
  }

  /**
   * Ver 1.1: ブロック単位でのOCR実行（手書き文字認識対応）
   */
  async performBlockOcr(
    extractOcrDto: ExtractOcrDto,
    tenantId: string,
    userId: string,
  ): Promise<OCRResult> {
    try {
      const { imageBase64, templateId, blockId, coordinates, documentId } = extractOcrDto;

      if (!blockId) {
        throw new HttpException('Block ID is required for block OCR', HttpStatus.BAD_REQUEST);
      }

      if (!coordinates) {
        throw new HttpException('Coordinates are required for block OCR', HttpStatus.BAD_REQUEST);
      }

      let actualTenantId = tenantId;
      
      this.logger.debug(`Block OCR request - documentId: ${documentId}, imageBase64: ${imageBase64?.substring(0, 50)}..., tenantId: ${tenantId}`);
      
      // documentIdが提供された場合は、実際のtenantIdを取得
      if (documentId) {
        this.logger.debug('DocumentId provided, fetching tenant info');
        try {
          const document = await this.documentRepository.findOne({
            where: { id: documentId },
          });
          
          if (!document) {
            this.logger.error(`Document not found for id: ${documentId}`);
            throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
          }

          this.logger.debug(`Found document with tenantId: ${document.tenantId}`);
          // 実際のドキュメントのtenantIdを使用
          actualTenantId = document.tenantId;
        } catch (error) {
          this.logger.error('Failed to get document:', error);
          throw new HttpException('Failed to retrieve document', HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
      
      this.logger.debug(`Using actualTenantId: ${actualTenantId} for template lookup`);

      if (!imageBase64) {
        throw new HttpException('Image data is required', HttpStatus.BAD_REQUEST);
      }

      // テンプレートとブロック定義を取得
      const template = await this.templateRepository.findOne({
        where: { id: templateId, tenantId: actualTenantId, isActive: true },
        relations: ['promptTemplates'],
      });

      if (!template) {
        throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
      }

      // ブロック定義を取得
      const block = template.blocks?.find(b => b.block_id === blockId);
      if (!block) {
        throw new HttpException('Block not found in template', HttpStatus.NOT_FOUND);
      }

      // フロントエンドでクロップ済みの画像を直接使用（地積測量AI-OCR方式）
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      this.logger.debug(`Using pre-cropped image from frontend (地積測量AI-OCR方式): ${imageBuffer.length} bytes`);
      
      // デバッグ用：クロップされた画像を一時保存
      try {
        const fs = require('fs');
        const path = require('path');
        const debugPath = `/tmp/debug_precropped_${Date.now()}.png`;
        fs.writeFileSync(debugPath, imageBuffer);
        this.logger.debug(`Debug pre-cropped image saved to: ${debugPath}`);
      } catch (debugError) {
        this.logger.warn(`Failed to save debug image: ${debugError.message}`);
      }
      
      // 最小サイズチェック
      if (imageBuffer.length < 1000) {
        this.logger.warn(`Pre-cropped image is very small (${imageBuffer.length} bytes), might be empty or invalid`);
        
        if (imageBuffer.length < 500) {
          this.logger.error(`Pre-cropped image too small (${imageBuffer.length} bytes), likely empty area.`);
          throw new HttpException(
            `Selected area appears to be empty or invalid. Please select an area with visible content.`, 
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // 手書き文字認識を使用するかどうか判定
      const useHandwritingOcr = this.shouldUseHandwritingOcr(template, block);
      
      let extractedData: any;
      let confidence: number;
      let validationErrors: any[] = [];

      if (useHandwritingOcr) {
        this.logger.debug(`Using Python handwriting OCR for block: ${blockId}`);
        
        // Python OCRサービスを呼び出し
        const pythonResult = await this.performPythonOcr(imageBase64, template, block);
        extractedData = pythonResult.extractedData;
        confidence = pythonResult.confidence;
        
        // ブロックのスキーマでバリデーション（手書き文字認識の場合は緩い検証）
        validationErrors = this.validateHandwritingExtraction(extractedData, block.schema);
      } else {
        this.logger.debug(`Using Claude Vision API for block: ${blockId}`);
        
        // ブロック用プロンプトを生成
        const prompts = await this.generateBlockPrompts(template, block);
        
        // Claude APIを呼び出し
        const message = await this.anthropic.messages.create({
          model: this.configService.get('CLAUDE_MODEL', 'claude-4-sonnet-20250514'),
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: imageBase64,
                  },
                },
                ...prompts.map(prompt => ({
                  type: 'text' as const,
                  text: prompt,
                })),
              ],
            },
          ],
        });

        this.logger.debug(`Received response from Claude API for block: ${blockId}`);

        // レスポンスからJSONを抽出
        const content = message.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response format');
        }

        extractedData = this.parseClaudeResponse(content.text, `performBlockOcr-${blockId}`);

        // ブロックのスキーマでバリデーション
        validationErrors = this.validateExtraction(extractedData, block.schema);

        // 信頼度スコアを計算
        confidence = validationErrors.length === 0 ? 0.95 : 0.7 - (validationErrors.length * 0.1);
      }

      // 抽出結果を保存
      const extraction = await this.extractionRepository.save({
        documentId: extractOcrDto.documentId,
        blockId: blockId,
        coordinates: coordinates,
        content: extractedData,
        extractedData: extractedData, // extracted_dataフィールドにも保存
        confidence: Math.max(0.1, Math.min(1.0, confidence)),
        modelName: 'claude-4-sonnet',
        promptUsed: `block_${blockId}_v${template.version}`,
        createdById: userId,
      });

      return {
        extractionId: extraction.id,
        content: extractedData,
        confidence: extraction.confidence,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      };

    } catch (error) {
      this.logger.error('Block OCR Error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'Block OCR processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 手書き文字認識を使用するかどうか判定
   */
  private shouldUseHandwritingOcr(template: Template, block: any): boolean {
    // 1. テンプレート名に「文字予測モデル」が含まれているかチェック
    if (template.name && template.name.includes('文字予測モデル')) {
      this.logger.debug('Using handwriting OCR: template name contains "文字予測モデル"');
      return true;
    }
    
    // 2. テンプレートの設定をチェック
    if (template.metadata && template.metadata.useHandwriting === true) {
      this.logger.debug('Using handwriting OCR: template metadata.useHandwriting is true');
      return true;
    }
    
    // 3. ブロックの設定をチェック
    if (block.useHandwriting === true) {
      this.logger.debug('Using handwriting OCR: block.useHandwriting is true');
      return true;
    }
    
    // 4. ブロックラベルに手書き関連キーワードが含まれているかチェック
    const handwritingKeywords = ['手書き', '手記', '署名', 'handwriting', 'signature', '数字', '文字'];
    if (block.label && handwritingKeywords.some(keyword => 
      block.label.toLowerCase().includes(keyword.toLowerCase())
    )) {
      this.logger.debug(`Using handwriting OCR: block label "${block.label}" contains handwriting keywords`);
      return true;
    }
    
    return false;
  }

  /**
   * 手書き文字認識結果用のバリデーション（緩い検証）
   */
  private validateHandwritingExtraction(data: any, schema: any): any[] {
    try {
      // 手書き文字認識の場合は、基本的なデータ構造のみ検証
      if (!data || typeof data !== 'object') {
        return [{ message: 'Invalid data structure', path: '', value: data }];
      }
      
      // textフィールドが存在するか確認
      if (!data.text && !data.value && !data.content) {
        return [{ message: 'No recognized text found', path: 'text', value: data }];
      }
      
      // 空文字列でないかチェック
      const recognizedText = data.text || data.value || data.content || '';
      if (recognizedText.trim() === '') {
        return [{ message: 'Empty text recognized', path: 'text', value: recognizedText }];
      }
      
      // 手書き文字認識の場合は、スキーマバリデーションは緩くする
      this.logger.debug('Handwriting OCR validation passed with relaxed rules');
      return [];
      
    } catch (error) {
      this.logger.warn('Handwriting validation error:', error);
      // バリデーションエラーでも処理を続行
      return [];
    }
  }

  /**
   * ブロック用プロンプトを生成
   */
  private async generateBlockPrompts(
    template: Template,
    block: any,
  ): Promise<string[]> {
    // ブロック用のプロンプトテンプレートを取得
    const blockPrompts = template.promptTemplates?.filter(p => p.blockId === block.block_id) || [];
    
    if (blockPrompts.length === 0) {
      // デフォルトプロンプトを生成
      return [this.generateDefaultBlockPrompt(block)];
    }

    // プロンプトを順序でソート
    const sortedPrompts = blockPrompts.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));

    // 変数を置換
    const variables = {
      schema: JSON.stringify(block.schema, null, 2),
      exampleJson: JSON.stringify(this.generateExampleFromSchema(block.schema), null, 2),
      fieldList: this.generateFieldListFromSchema(block.schema),
      blockLabel: block.label,
    };

    return sortedPrompts.map(prompt => 
      this.processPlaceholders(prompt.content, variables)
    );
  }

  /**
   * デフォルトブロックプロンプトを生成
   */
  private generateDefaultBlockPrompt(block: any): string {
    return `以下の画像は「${block.label}」の部分です。次のJSON Schemaに従って情報を抽出し、JSON形式で出力してください：

${JSON.stringify(block.schema, null, 2)}

抽出したデータをJSON形式で出力してください。`;
  }

  /**
   * プレースホルダーを処理
   */
  private processPlaceholders(content: string, variables: Record<string, any>): string {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(value));
    });
    return result;
  }

  /**
   * スキーマから例を生成
   */
  private generateExampleFromSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return {};
    
    const example: any = {};
    
    if (schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        const prop = schema.properties[key];
        switch (prop.type) {
          case 'string':
            example[key] = prop.format === 'date' ? '2024-01-01' : `サンプル${key}`;
            break;
          case 'number':
          case 'integer':
            example[key] = 123;
            break;
          case 'boolean':
            example[key] = true;
            break;
          case 'array':
            example[key] = prop.items ? [this.generateExampleFromSchema(prop.items)] : [];
            break;
          case 'object':
            example[key] = this.generateExampleFromSchema(prop);
            break;
          default:
            example[key] = null;
        }
      });
    }
    
    return example;
  }

  /**
   * スキーマからフィールドリストを生成
   */
  private generateFieldListFromSchema(schema: any): string {
    if (!schema || !schema.properties) return '';
    
    return Object.entries(schema.properties)
      .map(([key, value]: [string, any]) => `${key}:${value.type}`)
      .join(', ');
  }

  /**
   * Claude APIレスポンスからJSONを安全にパース（日本語文字対応強化版）
   */
  private parseClaudeResponse(responseText: string, context: string): any {
    try {
      // レスポンステキストをログ出力（デバッグ用）
      this.logger.debug(`[${context}] Claude response length: ${responseText.length}`);
      this.logger.debug(`[${context}] Claude response preview: ${responseText.substring(0, 300)}...`);
      this.logger.debug(`[${context}] Claude response full text for debug: ${responseText}`);
      
      // UTF-8文字の正規化（複数の正規化を試行）
      let normalizedText = responseText;
      try {
        normalizedText = responseText.normalize('NFC');
      } catch (normalizeError: any) {
        this.logger.warn(`[${context}] NFC normalization failed, trying NFD: ${normalizeError.message}`);
        try {
          normalizedText = responseText.normalize('NFD');
        } catch {
          this.logger.warn(`[${context}] All normalization failed, using original text`);
          normalizedText = responseText;
        }
      }
      
      // より包括的なJSONブロックパターンを試行
      const jsonPatterns = [
        /```json\s*\n([\s\S]*?)\n\s*```/gi,        // 標準的なマークダウン形式
        /```json\s*([\s\S]*?)\s*```/gi,            // 改行なしバージョン
        /```\s*\n([\s\S]*?)\n\s*```/gi,           // 言語指定なし
        /```\s*([\s\S]*?)\s*```/gi,               // 言語指定なし（改行なし）
        /\{[\s\S]*?\}/g,                          // 単一JSONオブジェクト
        /\{[\s\S]*\}/,                            // JSON全体をマッチ（最後のバックアップ）
      ];
      
      let jsonText: string | null = null;
      let patternUsed = 'none';
      
      // パターンマッチングを試行
      for (let i = 0; i < jsonPatterns.length; i++) {
        const matches = normalizedText.match(jsonPatterns[i]);
        if (matches && matches.length > 0) {
          // 最初の有効なマッチを使用
          for (const match of matches) {
            let candidate = match;
            
            // パターンに応じて抽出方法を調整
            if (i < 4) { // マークダウンパターンの場合
              const groups = normalizedText.match(jsonPatterns[i]);
              if (groups && groups[1]) {
                candidate = groups[1];
              }
            }
            
            // 候補がJSONらしいかチェック
            if (this.looksLikeJson(candidate)) {
              jsonText = candidate;
              patternUsed = `pattern${i + 1}`;
              this.logger.debug(`[${context}] JSON extracted using ${patternUsed}`);
              break;
            }
          }
          if (jsonText) break;
        }
      }
      
      if (!jsonText) {
        // JSONブロックが見つからない場合、テキスト全体から抽出を試行
        const directJsonMatch = this.extractJsonFromText(normalizedText);
        if (directJsonMatch) {
          jsonText = directJsonMatch;
          patternUsed = 'direct-extraction';
          this.logger.debug(`[${context}] JSON extracted using direct extraction`);
        }
      }
      
      if (!jsonText) {
        // 最後の手段として全体をJSONとして試行
        jsonText = normalizedText.trim();
        patternUsed = 'fulltext';
        this.logger.debug(`[${context}] No JSON block found, trying full text as JSON`);
      }
      
      // JSON文字列をクリーンアップ（日本語対応強化）
      const cleanedJsonText = this.cleanJsonTextV2(jsonText);
      this.logger.debug(`[${context}] Cleaned JSON text length: ${cleanedJsonText.length}`);
      this.logger.debug(`[${context}] Cleaned JSON text: ${cleanedJsonText.substring(0, 500)}...`);
      
      // JSONパース実行（複数の方法を試行）
      const parsedData = this.parseJsonSafely(cleanedJsonText, context);
      this.logger.debug(`[${context}] JSON parsing successful`);
      
      return parsedData;
      
    } catch (parseError: any) {
      // 詳細なエラーログを出力
      this.logger.error(`[${context}] JSON parsing failed:`, {
        error: parseError.message,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 500),
        stack: parseError.stack
      });
      
      // フォールバック処理
      return this.handleJsonParseError(responseText, parseError, context);
    }
  }
  
  /**
   * JSONらしいテキストかチェック
   */
  private looksLikeJson(text: string): boolean {
    const trimmed = text.trim();
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    );
  }

  /**
   * テキストから直接JSONオブジェクトを抽出
   */
  private extractJsonFromText(text: string): string | null {
    // ネストしたブレースを考慮してJSONオブジェクトを抽出
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (startIndex !== -1 && endIndex !== -1) {
      return text.substring(startIndex, endIndex + 1);
    }
    
    return null;
  }

  /**
   * JSON文字列をクリーンアップ（日本語文字対応強化版）
   */
  private cleanJsonTextV2(jsonText: string): string {
    let cleaned = jsonText.trim();
    
    // 基本的なクリーンアップ
    cleaned = cleaned
      // 先頭と末尾の不要な改行を除去
      .replace(/^\s*\n+/, '')
      .replace(/\n+\s*$/, '')
      // 制御文字を除去（ただし日本語文字は保持）
      .replace(/[\u0000-\u0008\u000E-\u001F\u007F-\u009F]/g, '')
      // 重複した空白を除去
      .replace(/[ \t]+/g, ' ')
      // 重複した改行を除去
      .replace(/\n\s*\n/g, '\n');
    
    // JSONブロックの前後の不要なテキストを除去
    // より慎重にマッチング
    const jsonStart = cleaned.search(/[\{\[]/);
    const jsonEnd = cleaned.search(/[\}\]](?![\s\S]*[\}\]])/);
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    // 特殊な文字列の修正（日本語文字周辺の問題）
    cleaned = cleaned
      // 不正なカンマを修正
      .replace(/,\s*([}\]])/g, '$1')
      // キーと値の間の不正な空白を修正
      .replace(/"\s*:\s*"/g, '":"')
      // 配列要素間の不正な空白を修正
      .replace(/"\s*,\s*"/g, '","');
    
    return cleaned;
  }

  /**
   * 安全なJSONパース（複数の方法を試行）
   */
  private parseJsonSafely(jsonText: string, context: string): any {
    const parseAttempts = [
      // 1. 標準的なJSONパース
      () => JSON.parse(jsonText),
      
      // 2. エスケープ処理後のJSONパース
      () => {
        const escaped = jsonText
          .replace(/\\/g, '\\\\')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        return JSON.parse(escaped);
      },
      
      // 3. 日本語文字のUnicodeエスケープ後のJSONパース
      () => {
        const unicodeEscaped = jsonText.replace(/[\u0080-\uFFFF]/g, (match) => {
          return '\\u' + ('0000' + match.charCodeAt(0).toString(16)).substr(-4);
        });
        return JSON.parse(unicodeEscaped);
      },
      
      // 4. 緩い引用符処理
      () => {
        const relaxed = jsonText
          .replace(/'/g, '"')  // シングルクォートをダブルクォートに
          .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":'); // 引用符なしキーを修正
        return JSON.parse(relaxed);
      }
    ];
    
    for (let i = 0; i < parseAttempts.length; i++) {
      try {
        const result = parseAttempts[i]();
        if (i > 0) {
          this.logger.warn(`[${context}] JSON parsed successfully using attempt ${i + 1}`);
        }
        return result;
      } catch (error: any) {
        this.logger.debug(`[${context}] Parse attempt ${i + 1} failed: ${error.message}`);
      }
    }
    
    // すべてのパース試行が失敗した場合
    throw new Error(`All JSON parse attempts failed for context: ${context}`);
  }

  /**
   * JSON文字列をクリーンアップ（日本語文字問題を修正）
   */
  private cleanJsonText(jsonText: string): string {
    return jsonText
      .trim()
      // 不要な改行や空白を除去
      .replace(/^\s*\n+/, '')
      .replace(/\n+\s*$/, '')
      // Unicode制御文字を除去（ただし日本語文字は保持）
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // 重複した改行を単一化
      .replace(/\n\s*\n/g, '\n')
      // JSONの前後の不要なテキストを除去
      .replace(/^[^\{\[].*?([\{\[])/s, '$1')
      .replace(/([\}\]]).*?$/s, '$1');
  }
  
  /**
   * JSONパースエラーのハンドリング
   */
  private handleJsonParseError(responseText: string, error: Error, context: string): any {
    this.logger.warn(`[${context}] JSON parsing failed, attempting recovery...`);
    
    try {
      // 日本語文字が含まれているかチェック
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(responseText);
      if (hasJapanese) {
        this.logger.debug(`[${context}] Japanese characters detected in response`);
      }
      
      // 段階的なフォールバック処理
      // 1. 部分的なJSONの抽出を試行
      const partialJsonMatch = responseText.match(/\{[^{}]*\}/g);
      if (partialJsonMatch && partialJsonMatch.length > 0) {
        try {
          const partialJson = JSON.parse(partialJsonMatch[0]);
          this.logger.warn(`[${context}] Recovered partial JSON data`);
          return partialJson;
        } catch {
          // 部分JSON抽出も失敗
        }
      }
      
      // 2. キー:値ペアの抽出を試行
      const keyValuePairs = this.extractKeyValuePairs(responseText);
      if (Object.keys(keyValuePairs).length > 0) {
        this.logger.warn(`[${context}] Recovered key-value pairs from response`);
        return keyValuePairs;
      }
      
    } catch (recoveryError: any) {
      this.logger.error(`[${context}] Recovery attempt failed:`, recoveryError.message);
    }
    
    // 最後のフォールバック: raw_textとして保存
    this.logger.warn(`[${context}] Using raw text fallback`);
    return {
      raw_text: responseText.substring(0, 1000), // 長すぎる場合は切り詰め
      parse_error: error.message,
      has_japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(responseText)
    };
  }
  
  /**
   * テキストからキー:値ペアを抽出
   */
  private extractKeyValuePairs(text: string): Record<string, any> {
    const pairs: Record<string, any> = {};
    
    // 様々なパターンでキー:値を抽出
    const patterns = [
      /"([^"]+)"\s*:\s*"([^"]*)"/g,           // "key": "value"
      /"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)/g,    // "key": number
      /'([^']+)'\s*:\s*'([^']*)'/g,           // 'key': 'value'
      /([^:\s]+)\s*:\s*([^\n,}]+)/g,          // key: value (loose)
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // 値の型を推定
        if (value === 'null') {
          pairs[key] = null;
        } else if (value === 'true') {
          pairs[key] = true;
        } else if (value === 'false') {
          pairs[key] = false;
        } else if (/^\d+$/.test(value)) {
          pairs[key] = parseInt(value, 10);
        } else if (/^\d+\.\d+$/.test(value)) {
          pairs[key] = parseFloat(value);
        } else {
          // 引用符を除去
          value = value.replace(/^["']|["']$/g, '');
          pairs[key] = value;
        }
      }
    });
    
    return pairs;
  }

  async reprocessExtraction(
    extractionId: string,
    tenantId: string,
  ): Promise<OCRResult> {
    // 既存の抽出結果を取得
    const extraction = await this.extractionRepository.findOne({
      where: { id: extractionId },
      relations: ['page', 'page.document'],
    });

    if (!extraction || extraction.page.document.tenantId !== tenantId) {
      throw new HttpException('Extraction not found', HttpStatus.NOT_FOUND);
    }

    // 画像を再度読み込んで処理
    // この実装では、画像はStorageサービスから取得する必要があります
    throw new HttpException(
      'Reprocessing requires image retrieval implementation',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  /**
   * OCR結果の修正を保存
   */
  async updateExtraction(
    extractionId: string,
    updateData: { correctedData: any; correctionReason?: string },
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.debug(`Updating extraction ${extractionId} with corrected data`);

      // 既存の抽出結果を取得
      const extraction = await this.extractionRepository.findOne({
        where: { id: extractionId },
        relations: ['document'],
      });

      if (!extraction) {
        throw new HttpException('Extraction not found', HttpStatus.NOT_FOUND);
      }

      // 修正前のデータを保存（履歴用）
      const originalData = extraction.extractedData;
      const correctionHistory = extraction.correctionHistory || [];

      // 新しい修正履歴エントリを追加
      correctionHistory.push({
        timestamp: new Date(),
        userId: userId,
        originalData: originalData,
        correctedData: updateData.correctedData,
        reason: updateData.correctionReason || '手動修正',
      });

      // 抽出結果を更新
      extraction.extractedData = updateData.correctedData;
      extraction.correctionHistory = correctionHistory;
      extraction.status = 'corrected'; // 修正済みステータス
      extraction.updatedAt = new Date();

      await this.extractionRepository.save(extraction);

      this.logger.log(`Extraction ${extractionId} updated successfully by user ${userId}`);

      return {
        success: true,
        message: 'OCR結果の修正が保存されました',
      };

    } catch (error) {
      this.logger.error('Failed to update extraction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'OCR結果の更新に失敗しました',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 抽出結果を取得
   */
  async getExtraction(extractionId: string, userId: string) {
    try {
      const extraction = await this.extractionRepository.findOne({
        where: { id: extractionId },
        relations: ['document', 'document.template'],
      });

      if (!extraction) {
        throw new HttpException('Extraction not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: extraction.id,
        extractedData: extraction.extractedData,
        blockId: extraction.blockId,
        coordinates: extraction.coordinates,
        status: extraction.status || 'completed',
        confidence: extraction.confidence,
        correctionHistory: extraction.correctionHistory || [],
        createdAt: extraction.createdAt,
        updatedAt: extraction.updatedAt,
        document: {
          id: extraction.document.id,
          fileName: extraction.document.fileName,
          template: extraction.document.template ? {
            id: extraction.document.template.id,
            name: extraction.document.template.name,
            blocks: extraction.document.template.blocks,
          } : null,
        },
      };

    } catch (error) {
      this.logger.error('Failed to get extraction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        '抽出結果の取得に失敗しました',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ドキュメントの全抽出結果を取得
   */
  async getDocumentExtractions(documentId: string, userId: string) {
    try {
      const extractions = await this.extractionRepository.find({
        where: { documentId, isDeleted: false }, // 論理削除されていないレコードのみ取得
        relations: ['document', 'document.template'],
        order: { createdAt: 'ASC' }, // 作成順でソート
      });

      return extractions.map(extraction => ({
        id: extraction.id,
        blockId: extraction.blockId,
        coordinates: extraction.coordinates,
        extractedData: extraction.extractedData || extraction.content, // extracted_dataを優先、なければcontentを使用
        status: extraction.status || 'completed',
        confidence: extraction.confidence,
        correctionHistory: extraction.correctionHistory || [],
        createdAt: extraction.createdAt,
        updatedAt: extraction.updatedAt,
      }));

    } catch (error) {
      this.logger.error('Failed to get document extractions:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'ドキュメントの抽出結果の取得に失敗しました',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 抽出結果を論理削除
   */
  async deleteExtraction(extractionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const extraction = await this.extractionRepository.findOne({
        where: { id: extractionId, isDeleted: false },
      });

      if (!extraction) {
        throw new HttpException('抽出結果が見つかりません', HttpStatus.NOT_FOUND);
      }

      // 論理削除フラグを設定（deletedByIdは一旦nullにする）
      await this.extractionRepository.update(extractionId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: null, // TODO: 実際のユーザーIDを使用する
      });

      this.logger.log(`Extraction logically deleted: ${extractionId} by user: ${userId}`);

      return {
        success: true,
        message: '抽出結果が削除されました',
      };

    } catch (error) {
      this.logger.error('Failed to delete extraction:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        '抽出結果の削除に失敗しました',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}