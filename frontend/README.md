# 地積測量図 AI-OCR 点検補正システム - フロントエンド

## セットアップ

### 1. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成してください：

```bash
cp .env.example .env
```

`.env`ファイルを編集して、Anthropic APIキーを設定してください：

```
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## AI-OCR機能の使い方

1. 点検補正画面で「範囲選択」モードを選択
2. PDF上でドラッグして、読み取りたい表の範囲を矩形選択
3. 表の種類を選択（地積一覧、境界点座標一覧など）
4. 「AI-OCR読込」ボタンをクリック
5. 読み取り結果が右ペインに表示されます

## 注意事項

- Anthropic APIキーは必ず環境変数に設定してください
- APIキーは絶対にコミットしないでください
- `.env`ファイルは`.gitignore`に含まれています