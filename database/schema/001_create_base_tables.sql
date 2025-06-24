-- 汎用ドキュメント点検補正システム
-- ベーステーブル作成スクリプト
-- PostgreSQL 15+ required (no PostGIS dependency)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS exports CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS extractions CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS prompt_templates CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- ===========================
-- 1. tenants table
-- ===========================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenants_name ON tenants(name);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- ===========================
-- 2. users table
-- ===========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer','editor','admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, username)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ===========================
-- 3. templates table
-- ===========================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version INT DEFAULT 1,
  schema_json JSONB NOT NULL,  -- JSON Schema definition
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX uq_template_ver ON templates(tenant_id, name, version);
CREATE INDEX idx_templates_tenant ON templates(tenant_id);
CREATE INDEX idx_templates_active ON templates(is_active);

-- ===========================
-- 4. prompt_templates table
-- ===========================
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant','fewshot')),
  content TEXT NOT NULL,
  sequence_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prompts_template ON prompt_templates(template_id);
CREATE INDEX idx_prompts_role ON prompt_templates(role);

-- ===========================
-- 5. documents table
-- ===========================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  page_count INT DEFAULT 0,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','completed','error')),
  uploaded_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_template ON documents(template_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at);

-- ===========================
-- 6. pages table
-- ===========================
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_no INT NOT NULL,
  image_path TEXT,
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending','processing','completed','error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, page_no)
);

CREATE INDEX idx_pages_document ON pages(document_id);
CREATE INDEX idx_pages_status ON pages(ocr_status);

-- ===========================
-- 7. extractions table
-- ===========================
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  table_group_id TEXT, -- 同じ種類のテーブルを識別するID
  extraction_type TEXT DEFAULT 'llm' CHECK (extraction_type IN ('llm','manual','imported')),
  content JSONB NOT NULL,  -- Raw LLM extraction result
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  llm_model TEXT,
  prompt_version TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_extractions_page ON extractions(page_id);
CREATE INDEX idx_extractions_group ON extractions(table_group_id);
CREATE INDEX idx_extractions_created ON extractions(created_at);

-- ===========================
-- 8. records table
-- ===========================
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_group_id TEXT, -- 同じ種類のテーブルを識別するID
  field_name TEXT NOT NULL,
  field_value TEXT,
  field_type TEXT,
  row_index INT DEFAULT 0,  -- テーブル内の行番号
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_records_document ON records(document_id);
CREATE INDEX idx_records_tenant ON records(tenant_id);
CREATE INDEX idx_records_field ON records(document_id, field_name);
CREATE INDEX idx_records_group ON records(table_group_id);
CREATE INDEX idx_records_validated ON records(is_validated);

-- ===========================
-- 9. exports table
-- ===========================
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id),
  format TEXT NOT NULL CHECK (format IN ('csv','xlsx','json','xml','pdf')),
  filter_json JSONB DEFAULT '{}',
  file_path TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','error')),
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_exports_tenant ON exports(tenant_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_created ON exports(created_at);

-- ===========================
-- 10. audit_logs table
-- ===========================
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE','SELECT')),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ===========================
-- Trigger functions
-- ===========================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_records_updated_at BEFORE UPDATE ON records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================
-- Comments
-- ===========================
COMMENT ON TABLE tenants IS '企業・組織情報を管理するテーブル';
COMMENT ON TABLE users IS 'ユーザー情報を管理するテーブル';
COMMENT ON TABLE templates IS '帳票テンプレート定義を管理するテーブル';
COMMENT ON TABLE prompt_templates IS 'LLMプロンプトテンプレートを管理するテーブル';
COMMENT ON TABLE documents IS 'アップロードされたドキュメントを管理するテーブル';
COMMENT ON TABLE pages IS 'ドキュメントの各ページ情報を管理するテーブル';
COMMENT ON TABLE extractions IS 'AI-OCRによる抽出結果を管理するテーブル';
COMMENT ON TABLE records IS '点検・補正後の確定データを管理するテーブル';
COMMENT ON TABLE exports IS 'エクスポートジョブを管理するテーブル';
COMMENT ON TABLE audit_logs IS '監査ログを管理するテーブル';