#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
アイリスデータセットで訓練したモデルを使用したWeb APIサーバー
このスクリプトは以下の処理を行います：
1. 保存されたモデルの読み込み
2. FastAPIを使用したWeb APIの提供
3. JSONリクエストからの特徴量の受け取り
4. 予測の実行と結果の返却
"""

import os
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# モデルファイルのパス
# Dockerコンテナ内と通常の実行環境の両方に対応
possible_paths = [
    "./iris_model.pkl",
    "../model/iris_model.pkl",
    "/app/model/iris_model.pkl",
    "model/iris_model.pkl"
]

MODEL_PATH = None
for path in possible_paths:
    if os.path.exists(path):
        MODEL_PATH = path
        break

if MODEL_PATH is None:
    MODEL_PATH = "../model/iris_model.pkl"  # デフォルト

# モデルの読み込み
try:
    model = joblib.load(MODEL_PATH)
    print(f"モデルを読み込みました: {MODEL_PATH}")
except FileNotFoundError:
    print(f"警告: モデルファイルが見つかりません: {MODEL_PATH}")
    print("APIは起動しますが、予測エンドポイントは機能しません。")
    model = None

# FastAPIアプリケーションの作成
app = FastAPI(
    title="アイリス分類API",
    description="アイリスの特徴量から品種を予測するAPI",
    version="1.0.0"
)

# CORS設定を追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 入力データのスキーマ定義
class IrisFeatures(BaseModel):
    sepal_length: float
    sepal_width: float
    petal_length: float
    petal_width: float

# 出力データのスキーマ定義
class IrisPrediction(BaseModel):
    species: str
    species_id: int
    probabilities: dict

# ルートエンドポイント
@app.get("/")
def read_root():
    """APIのルートエンドポイント"""
    return {
        "message": "アイリス分類APIへようこそ",
        "status": "稼働中",
        "endpoints": {
            "/predict": "アイリスの品種を予測（POST）",
            "/docs": "APIドキュメント（Swagger UI）"
        }
    }

# 予測エンドポイント
@app.post("/predict", response_model=IrisPrediction)
def predict(features: IrisFeatures):
    """アイリスの特徴量から品種を予測する"""
    if model is None:
        raise HTTPException(status_code=503, detail="モデルが読み込まれていません")
    
    # 特徴量の取得
    feature_array = np.array([
        features.sepal_length,
        features.sepal_width,
        features.petal_length,
        features.petal_width
    ]).reshape(1, -1)
    
    # 予測の実行
    prediction = model.predict(feature_array)[0]
    probabilities = model.predict_proba(feature_array)[0]
    
    # アイリスの品種名
    iris_species = ['setosa', 'versicolor', 'virginica']
    
    # 確率を辞書形式に変換
    prob_dict = {species: float(prob) for species, prob in zip(iris_species, probabilities)}
    
    # 結果の返却
    return {
        "species": iris_species[prediction],
        "species_id": int(prediction),
        "probabilities": prob_dict
    }

# メイン関数（直接実行された場合）
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8082, reload=True)