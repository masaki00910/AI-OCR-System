# ベースイメージとしてPythonの軽量イメージを使用
FROM python:3.10-slim

# 作業ディレクトリの設定
WORKDIR /app

# 依存ライブラリリストをコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ソースコードとモデルファイルをコンテナにコピー
COPY scripts/predict.py scripts/app.py ./
COPY model/iris_model.pkl ./

# コンテナ起動時のエントリーポイントをPythonに設定
ENTRYPOINT ["python"]

# デフォルトの実行コマンドをAPIサーバ起動に設定
CMD ["app.py"]

# Web API用途の場合に備えてポートを開放
EXPOSE 8082