-- サンプルデータとデフォルトテンプレート
-- 開発・テスト用の初期データ

-- ===========================
-- Sample Tenants
-- ===========================
INSERT INTO tenants (id, name, settings) VALUES
  ('11111111-1111-1111-1111-111111111111', 'デモ企業', '{"locale": "ja", "timezone": "Asia/Tokyo"}'),
  ('22222222-2222-2222-2222-222222222222', 'テスト商事', '{"locale": "ja", "timezone": "Asia/Tokyo"}');

-- ===========================
-- Sample Users
-- ===========================
-- Password: 'demo123' (bcrypt hash with salt rounds 10)
INSERT INTO users (id, tenant_id, email, username, password_hash, role) VALUES
  -- デモ企業のユーザー
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 
   'admin@demo.com', 'admin', '$2b$10$VTqMr7CYKCr9tAhMz7.fWOBcXfJCr4/KRgSCNv8DVrKJV8LdvF1/O', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 
   'editor@demo.com', 'editor', '$2b$10$VTqMr7CYKCr9tAhMz7.fWOBcXfJCr4/KRgSCNv8DVrKJV8LdvF1/O', 'editor'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 
   'viewer@demo.com', 'viewer', '$2b$10$VTqMr7CYKCr9tAhMz7.fWOBcXfJCr4/KRgSCNv8DVrKJV8LdvF1/O', 'viewer');

-- ===========================
-- Default Templates
-- ===========================

-- 1. 土地測量図テンプレート（既存システムとの互換性）
INSERT INTO templates (id, tenant_id, name, description, version, schema_json, created_by) VALUES
  ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 
   '土地測量図', '地積測量図のデータ抽出用テンプレート', 1,
   '{
     "type": "object",
     "properties": {
       "lot_no": {
         "type": "string",
         "title": "地番",
         "description": "土地の地番"
       },
       "survey_date": {
         "type": "string",
         "format": "date",
         "title": "測量日",
         "description": "測量実施日"
       },
       "area_m2": {
         "type": "number",
         "title": "面積（㎡）",
         "description": "土地の面積（平方メートル）"
       },
       "boundary_points": {
         "type": "array",
         "title": "境界点",
         "items": {
           "type": "object",
           "properties": {
             "pt_name": {"type": "string", "title": "点名"},
             "x": {"type": "number", "title": "X座標"},
             "y": {"type": "number", "title": "Y座標"},
             "marker_type": {"type": "string", "title": "杭種"}
           }
         }
       },
       "area_details": {
         "type": "array",
         "title": "面積計算",
         "items": {
           "type": "object",
           "properties": {
             "method": {"type": "string", "enum": ["三斜法", "座標法"], "title": "計算方法"},
             "base_m": {"type": "number", "title": "底辺"},
             "height_m": {"type": "number", "title": "高さ"},
             "area_m2": {"type": "number", "title": "面積"}
           }
         }
       }
     },
     "required": ["lot_no", "area_m2"]
   }',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- 2. 請求書テンプレート
INSERT INTO templates (id, tenant_id, name, description, version, schema_json, created_by) VALUES
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 
   '請求書', '請求書データの抽出用テンプレート', 1,
   '{
     "type": "object",
     "properties": {
       "invoice_no": {
         "type": "string",
         "title": "請求番号",
         "description": "請求書番号"
       },
       "issue_date": {
         "type": "string",
         "format": "date",
         "title": "発行日"
       },
       "due_date": {
         "type": "string",
         "format": "date",
         "title": "支払期限"
       },
       "customer_name": {
         "type": "string",
         "title": "顧客名"
       },
       "items": {
         "type": "array",
         "title": "明細",
         "items": {
           "type": "object",
           "properties": {
             "description": {"type": "string", "title": "品目"},
             "quantity": {"type": "number", "title": "数量"},
             "unit_price": {"type": "number", "title": "単価"},
             "amount": {"type": "number", "title": "金額"}
           }
         }
       },
       "subtotal": {
         "type": "number",
         "title": "小計"
       },
       "tax_amount": {
         "type": "number",
         "title": "消費税"
       },
       "total_amount": {
         "type": "number",
         "title": "合計金額"
       }
     },
     "required": ["invoice_no", "total_amount"]
   }',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- ===========================
-- Prompt Templates
-- ===========================

-- 土地測量図用プロンプト
INSERT INTO prompt_templates (template_id, role, content, sequence_order) VALUES
  ('11111111-1111-1111-1111-111111111112', 'system', 
   'あなたは地積測量図から情報を正確に抽出する専門家です。座標値、面積、地番などの数値データを慎重に読み取ってください。', 
   1),
  ('11111111-1111-1111-1111-111111111112', 'user', 
   '以下の地積測量図画像から、次の情報を抽出してJSON形式で出力してください：
   {{fieldList}}
   
   特に以下の点に注意してください：
   - 座標値は小数点以下3桁まで正確に読み取る
   - 面積は平方メートル単位で記載
   - 境界点は全ての点を漏れなく抽出
   
   期待するJSON形式：
   {{schema}}', 
   2),
  ('11111111-1111-1111-1111-111111111112', 'fewshot', 
   '入力例：地積測量図の画像
   出力例：
   {{exampleJSON}}', 
   3);

-- 請求書用プロンプト
INSERT INTO prompt_templates (template_id, role, content, sequence_order) VALUES
  ('22222222-2222-2222-2222-222222222223', 'system', 
   'あなたは請求書から情報を正確に抽出する専門家です。金額、日付、品目などの情報を慎重に読み取ってください。', 
   1),
  ('22222222-2222-2222-2222-222222222223', 'user', 
   '以下の請求書画像から、次の情報を抽出してJSON形式で出力してください：
   {{fieldList}}
   
   特に以下の点に注意してください：
   - 金額は税込・税抜を区別して抽出
   - 日付は YYYY-MM-DD 形式で統一
   - 明細項目は全て抽出
   
   期待するJSON形式：
   {{schema}}', 
   2);

-- ===========================
-- Sample Template Field Examples
-- ===========================
-- これらは実際のアプリケーションでプレースホルダーを置換する際の参考データ

-- 土地測量図のサンプルJSON
COMMENT ON TABLE templates IS '
Example JSON for survey template:
{
  "lot_no": "123-45",
  "survey_date": "2024-01-15",
  "area_m2": 234.567,
  "boundary_points": [
    {"pt_name": "1", "x": 12345.678, "y": -23456.789, "marker_type": "コンクリート杭"},
    {"pt_name": "2", "x": 12367.890, "y": -23478.901, "marker_type": "金属鋲"}
  ],
  "area_details": [
    {"method": "三斜法", "base_m": 12.345, "height_m": 6.789, "area_m2": 41.234},
    {"method": "座標法", "area_m2": 193.333}
  ]
}';

-- 請求書のサンプルJSON
COMMENT ON COLUMN templates.schema_json IS '
Example JSON for invoice template:
{
  "invoice_no": "INV-2024-001",
  "issue_date": "2024-01-01",
  "due_date": "2024-01-31",
  "customer_name": "株式会社サンプル",
  "items": [
    {"description": "商品A", "quantity": 10, "unit_price": 1000, "amount": 10000},
    {"description": "商品B", "quantity": 5, "unit_price": 2000, "amount": 10000}
  ],
  "subtotal": 20000,
  "tax_amount": 2000,
  "total_amount": 22000
}';