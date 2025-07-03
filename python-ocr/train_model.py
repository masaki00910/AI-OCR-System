#!/usr/bin/env python3
"""
手書き数字認識モデルの学習スクリプト
scikit-learnのdigitsデータセットを使用して、SVMモデルを学習し保存する
"""

import numpy as np
from sklearn import datasets
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

def train_handwriting_model():
    """手書き数字認識モデルを学習する"""
    
    # 1. データセットの読み込み
    print("Loading digits dataset...")
    digits = datasets.load_digits()
    X = digits.images  # 8x8のピクセルデータ
    y = digits.target  # 0-9のラベル
    
    # 画像を1次元配列に変換
    n_samples = len(X)
    X = X.reshape((n_samples, -1))
    
    # 2. データの分割
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # 3. データの正規化
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 4. モデルの学習
    print("Training SVM model...")
    model = SVC(kernel='rbf', gamma=0.001, C=10)
    model.fit(X_train_scaled, y_train)
    
    # 5. モデルの評価
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # 6. モデルとスケーラーの保存
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/digit_recognition_model.pkl')
    joblib.dump(scaler, 'models/scaler.pkl')
    print("\nModel and scaler saved successfully!")
    
    # 7. サンプル予測のテスト
    print("\nTesting with a sample...")
    sample_idx = 0
    sample_image = X_test[sample_idx:sample_idx+1]
    sample_scaled = scaler.transform(sample_image)
    prediction = model.predict(sample_scaled)[0]
    actual = y_test[sample_idx]
    print(f"Predicted: {prediction}, Actual: {actual}")
    
    return model, scaler

if __name__ == "__main__":
    train_handwriting_model()