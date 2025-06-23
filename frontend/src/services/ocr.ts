import axios from 'axios';

interface OCRResult {
  type: string;
  rows: any[];
  confidence: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class OCRService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  /**
   * PDF上の選択範囲を画像として切り出す
   */
  async extractImageFromPDF(
    pdfCanvas: HTMLCanvasElement,
    selection: Rectangle,
    scale: number
  ): Promise<string> {
    // 新しいCanvasを作成
    const extractCanvas = window.document.createElement('canvas');
    const ctx = extractCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // デバイスピクセル比を取得
    const devicePixelRatio = window.devicePixelRatio || 1;

    // キャンバスの実際のサイズを取得
    const canvasWidth = pdfCanvas.width;
    const canvasHeight = pdfCanvas.height;
    
    // 表示サイズを取得
    const displayWidth = pdfCanvas.clientWidth;
    const displayHeight = pdfCanvas.clientHeight;
    
    // スケール比を計算
    const scaleX = canvasWidth / displayWidth;
    const scaleY = canvasHeight / displayHeight;

    // 選択範囲を実際のキャンバス座標に変換
    const sourceX = selection.x * scaleX;
    const sourceY = selection.y * scaleY;
    const sourceWidth = selection.width * scaleX;
    const sourceHeight = selection.height * scaleY;

    // 出力キャンバスのサイズを設定
    extractCanvas.width = sourceWidth;
    extractCanvas.height = sourceHeight;

    // PDFキャンバスから選択範囲を切り出し
    ctx.drawImage(
      pdfCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    // Base64形式で返す（data:image/png;base64, の部分を削除）
    const dataUrl = extractCanvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    
    if (!base64) {
      throw new Error('Failed to extract image from PDF');
    }
    
    return base64;
  }

  /**
   * バックエンドAPI経由でOCRを実行
   */
  async performOCR(
    imageBase64: string,
    tableType: string
  ): Promise<OCRResult> {
    try {
      const response = await axios.post(`${this.apiUrl}/ocr`, {
        imageBase64,
        tableType,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000, // 60秒のタイムアウト
      });

      return response.data;
    } catch (error: any) {
      console.error('OCR Error:', error);
      if (error.response?.status === 500 && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.response?.status === 400 && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

}

// シングルトンインスタンスの作成
let ocrServiceInstance: OCRService | null = null;

export function getOCRService(): OCRService {
  if (!ocrServiceInstance) {
    ocrServiceInstance = new OCRService();
  }
  return ocrServiceInstance;
}

export const runOcrOnCroppedImage = async (
  documentId: string,
  blockId: string,
  templateId: string,
  coordinates: { pageNumber: number; x_1: number; y_1: number; x_2: number; y_2: number },
  prompt?: string,
) => {
  try {
    const response = await api.post('/ocr/extract-from-coordinates', {
      documentId,
      blockId,
      templateId,
      coordinates,
      prompt,
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to crop image from PDF');
  }
};