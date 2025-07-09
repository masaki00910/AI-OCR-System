# ベースイメージとしてPythonの軽量イメージを使用
FROM python:3.10-slim

# 作業ディレクトリの設定
WORKDIR /app

# システムパッケージのインストール（curlとhealth checkのため）
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 依存ライブラリリストをコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ソースコードとモデルファイルをコンテナにコピー
COPY scripts/ ./scripts/
COPY model/ ./model/
COPY data/ ./data/

# 起動スクリプトを作成
RUN echo '#!/bin/bash\n\
# モデルファイルが存在しない場合はトレーニングを実行\n\
if [ ! -f model/iris_model.pkl ]; then\n\
    echo "モデルファイルが見つかりません。トレーニングを開始します..."\n\
    cd scripts && python train_model.py\n\
    if [ $? -eq 0 ]; then\n\
        echo "モデルトレーニングが完了しました。"\n\
    else\n\
        echo "モデルトレーニングでエラーが発生しました。"\n\
        exit 1\n\
    fi\n\
else\n\
    echo "モデルファイルが見つかりました。"\n\
fi\n\
\n\
# APIサーバーを起動\n\
echo "APIサーバーを起動しています..."\n\
python scripts/app.py' > /app/start.sh && chmod +x /app/start.sh

# 起動スクリプトを実行
CMD ["/app/start.sh"]

# Web API用途の場合に備えてポートを開放
EXPOSE 8082