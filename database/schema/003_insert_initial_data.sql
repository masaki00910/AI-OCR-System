-- Initial test data for development/testing

-- Insert demo tenant
INSERT INTO tenants (id, name, settings, is_active, created_at, updated_at) 
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'デモ企業',
    '{"theme": "default", "timezone": "Asia/Tokyo", "language": "ja"}',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert demo admin user
-- Password is 'demo123' hashed with bcrypt (rounds=10)
INSERT INTO users (id, tenant_id, email, username, password_hash, role, is_active, created_at, updated_at) 
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'admin@demo.com',
    'admin',
    '$2b$10$RD2NNKh/nodRLrZsewjcMOGG9nmbHafNdJlN8sWbONOWlKonqHowS',
    'admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert demo user
INSERT INTO users (id, tenant_id, email, username, password_hash, role, is_active, created_at, updated_at) 
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'user@demo.com',
    'user',
    '$2b$10$RD2NNKh/nodRLrZsewjcMOGG9nmbHafNdJlN8sWbONOWlKonqHowS',
    'editor',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert demo template
INSERT INTO templates (id, tenant_id, name, description, version, schema_json, is_active, created_by, created_at, updated_at) 
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    '請求書テンプレート',
    'デモ用の請求書処理テンプレート',
    1,
    '{
        "type": "object",
        "title": "請求書データ",
        "properties": {
            "company_name": {
                "type": "string",
                "title": "会社名",
                "description": "請求書発行会社名"
            },
            "invoice_number": {
                "type": "string", 
                "title": "請求書番号",
                "description": "請求書の識別番号"
            },
            "invoice_date": {
                "type": "string",
                "format": "date",
                "title": "請求日",
                "description": "請求書の発行日"
            },
            "due_date": {
                "type": "string",
                "format": "date", 
                "title": "支払期限",
                "description": "支払いの期限日"
            },
            "total_amount": {
                "type": "number",
                "title": "合計金額",
                "description": "税込み合計金額"
            },
            "items": {
                "type": "array",
                "title": "明細項目",
                "items": {
                    "type": "object",
                    "properties": {
                        "description": {
                            "type": "string",
                            "title": "商品・サービス名"
                        },
                        "quantity": {
                            "type": "number",
                            "title": "数量"
                        },
                        "unit_price": {
                            "type": "number",
                            "title": "単価"
                        },
                        "amount": {
                            "type": "number",
                            "title": "金額"
                        }
                    }
                }
            }
        },
        "required": ["company_name", "invoice_number", "total_amount"]
    }',
    true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert prompt templates for the demo template
INSERT INTO prompt_templates (id, template_id, role, content, sequence_order, is_active, created_at, updated_at) 
VALUES 
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'system',
        'あなたは請求書の情報を正確に抽出するAIアシスタントです。画像から以下の情報を抽出してください：

- 発行会社名
- 請求書番号  
- 請求日
- 支払期限
- 合計金額
- 明細項目（商品名、数量、単価、金額）

抽出した情報は指定されたJSON形式で返してください。',
        0,
        true,
        NOW(),
        NOW()
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'user',
        'この請求書画像から {{fieldList}} の情報を抽出してください。

以下のJSON形式で回答してください：
{{exampleJson}}

不明な項目は null または空配列で返してください。',
        1,
        true,
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

COMMIT;