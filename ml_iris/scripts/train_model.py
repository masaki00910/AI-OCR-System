#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
アイリスデータセットを使用した機械学習モデルの訓練スクリプト
このスクリプトは以下の処理を行います：
1. アイリスデータセットの読み込み
2. データの前処理（トレーニングデータとテストデータに分割）
3. ランダムフォレスト分類器の訓練
4. モデルの評価
5. モデルの保存
"""

import os
import numpy as np
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

# 出力ディレクトリの設定
MODEL_DIR = "../model"
DATA_DIR = "../data"
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

def load_and_prepare_data():
    """アイリスデータセットを読み込み、前処理を行う"""
    print("データセットを読み込んでいます...")
    
    # アイリスデータセットの読み込み
    iris = load_iris()
    X = iris.data
    y = iris.target
    feature_names = iris.feature_names
    target_names = iris.target_names
    
    # データフレームの作成
    df = pd.DataFrame(X, columns=feature_names)
    df['species'] = [target_names[i] for i in y]
    df['target'] = y
    
    # データの保存
    df.to_csv(os.path.join(DATA_DIR, "iris_dataset.csv"), index=False)
    print(f"データセットを {os.path.join(DATA_DIR, 'iris_dataset.csv')} に保存しました")
    
    # データの可視化
    plt.figure(figsize=(12, 10))
    sns.pairplot(df, hue='species', vars=feature_names)
    plt.savefig(os.path.join(DATA_DIR, "iris_visualization.png"))
    print(f"データの可視化を {os.path.join(DATA_DIR, 'iris_visualization.png')} に保存しました")
    
    # トレーニングデータとテストデータに分割
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )
    
    return X_train, X_test, y_train, y_test, feature_names, target_names

def train_model(X_train, y_train):
    """ランダムフォレスト分類器を訓練する"""
    print("モデルを訓練しています...")
    
    # ランダムフォレスト分類器の初期化
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=5,
        random_state=42
    )
    
    # モデルの訓練
    model.fit(X_train, y_train)
    
    return model

def evaluate_model(model, X_test, y_test, target_names):
    """モデルの評価を行う"""
    print("モデルを評価しています...")
    
    # テストデータでの予測
    y_pred = model.predict(X_test)
    
    # 精度の計算
    accuracy = accuracy_score(y_test, y_pred)
    print(f"精度: {accuracy:.4f}")
    
    # 分類レポートの表示
    report = classification_report(y_test, y_pred, target_names=target_names)
    print("分類レポート:")
    print(report)
    
    # 評価結果をファイルに保存
    with open(os.path.join(DATA_DIR, "model_evaluation.txt"), "w") as f:
        f.write(f"精度: {accuracy:.4f}\n\n")
        f.write("分類レポート:\n")
        f.write(report)
    
    print(f"評価結果を {os.path.join(DATA_DIR, 'model_evaluation.txt')} に保存しました")
    
    return accuracy, report

def save_model(model, feature_names):
    """モデルを保存する"""
    print("モデルを保存しています...")
    
    # モデルの保存
    model_path = os.path.join(MODEL_DIR, "iris_model.pkl")
    joblib.dump(model, model_path)
    print(f"モデルを {model_path} に保存しました")
    
    # 特徴量の重要度の可視化
    plt.figure(figsize=(10, 6))
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    plt.title('特徴量の重要度')
    plt.bar(range(len(feature_names)), importances[indices], align='center')
    plt.xticks(range(len(feature_names)), [feature_names[i] for i in indices], rotation=90)
    plt.tight_layout()
    plt.savefig(os.path.join(DATA_DIR, "feature_importance.png"))
    print(f"特徴量の重要度を {os.path.join(DATA_DIR, 'feature_importance.png')} に保存しました")

def main():
    """メイン関数"""
    print("アイリスデータセットを使用したモデル訓練を開始します...")
    
    # データの読み込みと前処理
    X_train, X_test, y_train, y_test, feature_names, target_names = load_and_prepare_data()
    
    # モデルの訓練
    model = train_model(X_train, y_train)
    
    # モデルの評価
    evaluate_model(model, X_test, y_test, target_names)
    
    # モデルの保存
    save_model(model, feature_names)
    
    print("モデル訓練が完了しました！")

if __name__ == "__main__":
    main()