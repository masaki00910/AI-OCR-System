#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
アイリスデータセットで訓練したモデルを使用した予測スクリプト
このスクリプトは以下の処理を行います：
1. 保存されたモデルの読み込み
2. コマンドライン引数から特徴量を受け取る
3. 予測の実行
4. 結果の出力
"""

import argparse
import joblib
import os
import numpy as np

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

def load_model():
    """保存されたモデルを読み込む"""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"モデルファイルが見つかりません: {MODEL_PATH}")
    
    return joblib.load(MODEL_PATH)

def predict(model, features):
    """特徴量を使用して予測を行う"""
    # 特徴量を2次元配列に変換
    features_array = np.array(features).reshape(1, -1)
    
    # 予測の実行
    prediction = model.predict(features_array)
    probabilities = model.predict_proba(features_array)
    
    return prediction[0], probabilities[0]

def main():
    """メイン関数"""
    # コマンドライン引数の設定
    parser = argparse.ArgumentParser(description="アイリスの品種を予測します")
    parser.add_argument("--sepal_length", type=float, required=True, help="萼片の長さ (cm)")
    parser.add_argument("--sepal_width", type=float, required=True, help="萼片の幅 (cm)")
    parser.add_argument("--petal_length", type=float, required=True, help="花弁の長さ (cm)")
    parser.add_argument("--petal_width", type=float, required=True, help="花弁の幅 (cm)")
    args = parser.parse_args()
    
    try:
        # モデルの読み込み
        model = load_model()
        
        # 特徴量の取得
        features = [
            args.sepal_length,
            args.sepal_width,
            args.petal_length,
            args.petal_width
        ]
        
        # 予測の実行
        prediction, probabilities = predict(model, features)
        
        # アイリスの品種名
        iris_species = ['setosa', 'versicolor', 'virginica']
        
        # 結果の出力
        print(f"予測結果: {iris_species[prediction]} (クラス {prediction})")
        print("各クラスの確率:")
        for i, species in enumerate(iris_species):
            print(f"  {species}: {probabilities[i]:.4f}")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())