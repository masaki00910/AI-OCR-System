#!/bin/bash
# モデルの初期化スクリプト

echo "Initializing handwriting recognition model..."

# モデルディレクトリの作成
mkdir -p models

# モデルの学習
python train_model.py

echo "Model initialization completed!"