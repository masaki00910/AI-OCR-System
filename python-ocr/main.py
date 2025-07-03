"""
手書き文字認識APIサーバー
FastAPIを使用してRESTful APIを提供
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import logging
from handwriting_recognizer import HandwritingRecognizer
import os
from typing import List, Dict, Optional

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPIアプリケーションの初期化
app = FastAPI(
    title="Handwriting OCR Service",
    description="手書き文字認識APIサービス",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に設定
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 手書き文字認識器の初期化
try:
    recognizer = HandwritingRecognizer()
    logger.info("Handwriting recognizer initialized successfully")
except FileNotFoundError:
    logger.warning("Model files not found. Please run train_model.py first.")
    recognizer = None

# リクエスト/レスポンスモデル
class OCRRequest(BaseModel):
    """OCRリクエストモデル"""
    image: str  # Base64エンコードされた画像
    options: Optional[Dict] = None  # 追加オプション

class DigitInfo(BaseModel):
    """個々の数字情報"""
    digit: str
    confidence: float
    bbox: Dict[str, int]

class OCRResponse(BaseModel):
    """OCRレスポンスモデル"""
    text: str
    confidence: float
    digits: List[Dict]
    boxes: List[Dict[str, int]]
    success: bool = True
    error: Optional[str] = None

class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str
    model_loaded: bool
    version: str

# エンドポイント
@app.get("/", response_model=HealthResponse)
async def root():
    """ルートエンドポイント - サービス情報を返す"""
    return HealthResponse(
        status="healthy",
        model_loaded=recognizer is not None,
        version="1.0.0"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """ヘルスチェックエンドポイント"""
    return HealthResponse(
        status="healthy",
        model_loaded=recognizer is not None,
        version="1.0.0"
    )

@app.post("/api/v1/ocr/handwriting", response_model=OCRResponse)
async def recognize_handwriting(request: OCRRequest):
    """手書き文字認識エンドポイント
    
    Args:
        request: Base64エンコードされた画像を含むリクエスト
        
    Returns:
        認識結果を含むレスポンス
    """
    if recognizer is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please train the model first."
        )
    
    try:
        # Base64デコード
        image_data = base64.b64decode(request.image)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        logger.info(f"Processing image with shape: {image.shape}")
        
        # 手書き文字認識
        result = recognizer.recognize(image)
        
        logger.info(f"Recognition result: {result['text']} (confidence: {result['confidence']})")
        
        return OCRResponse(
            text=result['text'],
            confidence=result['confidence'],
            digits=result['digits'],
            boxes=result['boxes'],
            success=True
        )
        
    except Exception as e:
        logger.error(f"Recognition error: {str(e)}")
        return OCRResponse(
            text="",
            confidence=0.0,
            digits=[],
            boxes=[],
            success=False,
            error=str(e)
        )

@app.post("/api/v1/ocr/train")
async def train_model():
    """モデルを再学習するエンドポイント（開発用）"""
    try:
        # train_model.pyを実行
        import subprocess
        result = subprocess.run(
            ["python", "train_model.py"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            # モデルを再読み込み
            global recognizer
            recognizer = HandwritingRecognizer()
            return {"success": True, "message": "Model trained successfully"}
        else:
            raise Exception(f"Training failed: {result.stderr}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)