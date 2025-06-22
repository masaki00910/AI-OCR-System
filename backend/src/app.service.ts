import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '地積測量図 AI-OCR 点検補正システム API';
  }
}