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

-- Insert supervisor user (係長)
INSERT INTO users (id, tenant_id, email, username, password_hash, role, is_active, created_at, updated_at) 
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'supervisor@demo.com',
    'supervisor',
    '$2b$10$RD2NNKh/nodRLrZsewjcMOGG9nmbHafNdJlN8sWbONOWlKonqHowS',
    'supervisor',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert manager user (部長)
INSERT INTO users (id, tenant_id, email, username, password_hash, role, is_active, created_at, updated_at) 
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'manager@demo.com',
    'manager',
    '$2b$10$RD2NNKh/nodRLrZsewjcMOGG9nmbHafNdJlN8sWbONOWlKonqHowS',
    'manager',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert demo template
INSERT INTO templates (id, tenant_id, name, description, version, schema_json, is_active, created_by, created_at, updated_at) 
VALUES (
    'template1-1111-1111-1111-111111111111',
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
        'prompt01-1111-1111-1111-111111111111',
        'template1-1111-1111-1111-111111111111',
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
        'prompt02-1111-1111-1111-111111111111',
        'template1-1111-1111-1111-111111111111',
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

-- Insert sample workflow definitions
INSERT INTO workflow_definitions (id, tenant_id, name, description, version, graph_json, is_active, created_by, created_at, updated_at)
VALUES 
    (
        'workflow1-1111-1111-1111-111111111111',
        'tenant-demo-tenant-demo-tenant01',
        '3段階承認フロー',
        'ドキュメントの承認を3段階で行うワークフロー',
        1,
        '{}',
        true,
        'admin-admin-admin-admin-admin01',
        NOW(),
        NOW()
    ),
    (
        'workflow2-2222-2222-2222-222222222222',
        'tenant-demo-tenant-demo-tenant01',
        'シンプル承認フロー',
        '単一の承認者による承認フロー',
        1,
        '{}',
        true,
        'admin-admin-admin-admin-admin01',
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- Insert workflow states for 3段階承認フロー
INSERT INTO workflow_states (id, workflow_id, state_key, label, description, is_initial, is_final, sla_hours, notification_template, created_at, updated_at)
VALUES 
    -- 3段階承認フロー
    ('state01-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'draft', '申請', '申請書作成中', true, false, NULL, '', NOW(), NOW()),
    ('state02-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'review', 'レビュー', '初期レビュー中', false, false, 24, '', NOW(), NOW()),
    ('state03-1111-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'approval', '承認', '最終承認中', false, false, 48, '', NOW(), NOW()),
    ('state04-1111-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'completed', '完了', '承認完了', false, true, NULL, '', NOW(), NOW()),
    ('state05-1111-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'rejected', '却下', '承認却下', false, true, NULL, '', NOW(), NOW()),
    
    -- シンプル承認フロー
    ('state01-2222-2222-2222-222222222222', 'workflow2-2222-2222-2222-222222222222', 'draft', '申請', '申請書作成中', true, false, NULL, '', NOW(), NOW()),
    ('state02-2222-2222-2222-222222222222', 'workflow2-2222-2222-2222-222222222222', 'approval', '承認', '承認中', false, false, 72, '', NOW(), NOW()),
    ('state03-2222-2222-2222-222222222222', 'workflow2-2222-2222-2222-222222222222', 'completed', '完了', '承認完了', false, true, NULL, '', NOW(), NOW()),
    ('state04-2222-2222-2222-222222222222', 'workflow2-2222-2222-2222-222222222222', 'rejected', '却下', '承認却下', false, true, NULL, '', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert workflow transitions for 3段階承認フロー  
INSERT INTO workflow_transitions (id, workflow_id, from_state_id, to_state_id, action_key, action_label, requires_comment, auto_advance, condition_expr, created_at, updated_at)
VALUES 
    -- 3段階承認フロー
    ('trans01-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'state01-1111-1111-1111-111111111111', 'state02-1111-1111-1111-111111111111', 'submit', '提出', false, true, '', NOW(), NOW()),
    ('trans02-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'state02-1111-1111-1111-111111111111', 'state03-1111-1111-1111-1111-111111111111', 'approve', '承認', false, false, '', NOW(), NOW()),
    ('trans03-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'state02-1111-1111-1111-111111111111', 'state05-1111-1111-1111-1111-111111111111', 'reject', '却下', true, false, '', NOW(), NOW()),
    ('trans04-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'state03-1111-1111-1111-1111-111111111111', 'state04-1111-1111-1111-1111-111111111111', 'approve', '承認', false, false, '', NOW(), NOW()),
    ('trans05-1111-1111-1111-111111111111', 'workflow1-1111-1111-1111-111111111111', 'state03-1111-1111-1111-1111-111111111111', 'state05-1111-1111-1111-1111-111111111111', 'reject', '却下', true, false, '', NOW(), NOW()),
    
    -- シンプル承認フロー
    ('trans01-2222-2222-2222-222222222222', 'workflow2-2222-2222-2222-222222222222', 'state01-2222-2222-2222-222222222222', 'state02-2222-2222-2222-222222222222', 'submit', '提出', false, true, '', NOW(), NOW()),
    ('trans02-2222-2222-2222-222222222222', 'workflow2-2222-2222-2222-222222222222', 'state02-2222-2222-2222-222222222222', 'state03-2222-2222-2222-222222222222', 'approve', '承認', false, false, '', NOW(), NOW()),
    ('trans03-2222-2222-2222-222222222222', 'workflow2-2222-2222-2222-222222222222', 'state02-2222-2222-2222-222222222222', 'state04-2222-2222-2222-222222222222', 'reject', '却下', true, false, '', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert state actions for workflow states
INSERT INTO state_actions (id, state_id, next_state_id, action_key, display_name, requires_comment, is_default, display_order, created_at, updated_at)
VALUES 
    -- 3段階承認フロー - レビュー状態のアクション
    ('action01-1111-1111-1111-111111111111', 'state02-1111-1111-1111-111111111111', 'state03-1111-1111-1111-1111-111111111111', 'approve', '承認', false, true, 1, NOW(), NOW()),
    ('action02-1111-1111-1111-111111111111', 'state02-1111-1111-1111-111111111111', 'state05-1111-1111-1111-1111-111111111111', 'reject', '却下', true, false, 2, NOW(), NOW()),
    
    -- 3段階承認フロー - 承認状態のアクション  
    ('action03-1111-1111-1111-111111111111', 'state03-1111-1111-1111-1111-111111111111', 'state04-1111-1111-1111-1111-111111111111', 'approve', '承認', false, true, 1, NOW(), NOW()),
    ('action04-1111-1111-1111-111111111111', 'state03-1111-1111-1111-1111-111111111111', 'state05-1111-1111-1111-1111-111111111111', 'reject', '却下', true, false, 2, NOW(), NOW()),
    
    -- シンプル承認フロー - 承認状態のアクション
    ('action01-2222-2222-2222-222222222222', 'state02-2222-2222-2222-222222222222', 'state03-2222-2222-2222-222222222222', 'approve', '承認', false, true, 1, NOW(), NOW()),
    ('action02-2222-2222-2222-222222222222', 'state02-2222-2222-2222-222222222222', 'state04-2222-2222-2222-222222222222', 'reject', '却下', true, false, 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;