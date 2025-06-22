-- Row Level Security (RLS) 設定
-- マルチテナント分離を実現するためのセキュリティポリシー

-- ===========================
-- Enable RLS on tables
-- ===========================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ===========================
-- Create RLS policies
-- ===========================

-- Function to get current tenant_id from session
CREATE OR REPLACE FUNCTION current_tenant_id() 
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user_id from session
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user_role from session
CREATE OR REPLACE FUNCTION current_user_role() 
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.user_role', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- Policies for tenants table
-- ===========================
-- Admin users can see all tenants
CREATE POLICY tenants_select_policy ON tenants
  FOR SELECT
  USING (
    current_user_role() = 'admin' 
    OR id = current_tenant_id()
  );

-- Only super admin can insert/update/delete tenants
CREATE POLICY tenants_admin_policy ON tenants
  FOR ALL
  USING (current_user_role() = 'super_admin');

-- ===========================
-- Policies for users table
-- ===========================
-- Users can only see users from their tenant
CREATE POLICY users_tenant_isolation ON users
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Admin can manage users in their tenant
CREATE POLICY users_admin_policy ON users
  FOR ALL
  USING (
    tenant_id = current_tenant_id() 
    AND current_user_role() = 'admin'
  );

-- Users can update their own profile
CREATE POLICY users_self_update ON users
  FOR UPDATE
  USING (id = current_user_id())
  WITH CHECK (id = current_user_id());

-- ===========================
-- Policies for templates table
-- ===========================
-- All users can view templates from their tenant
CREATE POLICY templates_select_policy ON templates
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Only admin and editor can create/update templates
CREATE POLICY templates_write_policy ON templates
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id() 
    AND current_user_role() IN ('admin', 'editor')
  );

CREATE POLICY templates_update_policy ON templates
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id() 
    AND current_user_role() IN ('admin', 'editor')
  );

-- Only admin can delete templates
CREATE POLICY templates_delete_policy ON templates
  FOR DELETE
  USING (
    tenant_id = current_tenant_id() 
    AND current_user_role() = 'admin'
  );

-- ===========================
-- Policies for prompt_templates table
-- ===========================
-- Inherit access from parent template
CREATE POLICY prompt_templates_policy ON prompt_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = prompt_templates.template_id 
      AND templates.tenant_id = current_tenant_id()
    )
  );

-- ===========================
-- Policies for documents table
-- ===========================
-- All users can view documents from their tenant
CREATE POLICY documents_select_policy ON documents
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Editor and admin can create documents
CREATE POLICY documents_insert_policy ON documents
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id() 
    AND current_user_role() IN ('admin', 'editor')
  );

-- Editor and admin can update documents
CREATE POLICY documents_update_policy ON documents
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id() 
    AND current_user_role() IN ('admin', 'editor')
  );

-- Only admin can delete documents
CREATE POLICY documents_delete_policy ON documents
  FOR DELETE
  USING (
    tenant_id = current_tenant_id() 
    AND current_user_role() = 'admin'
  );

-- ===========================
-- Policies for pages table
-- ===========================
-- Inherit access from parent document
CREATE POLICY pages_policy ON pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = pages.document_id 
      AND documents.tenant_id = current_tenant_id()
    )
  );

-- ===========================
-- Policies for extractions table
-- ===========================
-- Inherit access from parent page
CREATE POLICY extractions_policy ON extractions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pages 
      JOIN documents ON documents.id = pages.document_id
      WHERE pages.id = extractions.page_id 
      AND documents.tenant_id = current_tenant_id()
    )
  );

-- ===========================
-- Policies for records table
-- ===========================
-- Users can view records from their tenant
CREATE POLICY records_select_policy ON records
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Editor and admin can manage records
CREATE POLICY records_write_policy ON records
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id() 
    AND current_user_role() IN ('admin', 'editor')
  );

CREATE POLICY records_update_policy ON records
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id() 
    AND current_user_role() IN ('admin', 'editor')
  );

CREATE POLICY records_delete_policy ON records
  FOR DELETE
  USING (
    tenant_id = current_tenant_id() 
    AND current_user_role() IN ('admin', 'editor')
  );

-- ===========================
-- Policies for exports table
-- ===========================
-- Users can view exports from their tenant
CREATE POLICY exports_select_policy ON exports
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Editor and admin can create exports
CREATE POLICY exports_insert_policy ON exports
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id() 
    AND current_user_role() IN ('admin', 'editor')
  );

-- Only creator or admin can update/delete exports
CREATE POLICY exports_update_policy ON exports
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id() 
    AND (created_by = current_user_id() OR current_user_role() = 'admin')
  );

CREATE POLICY exports_delete_policy ON exports
  FOR DELETE
  USING (
    tenant_id = current_tenant_id() 
    AND (created_by = current_user_id() OR current_user_role() = 'admin')
  );

-- ===========================
-- Policies for audit_logs table
-- ===========================
-- Only admin can view audit logs from their tenant
CREATE POLICY audit_logs_policy ON audit_logs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id() 
    AND current_user_role() = 'admin'
  );

-- Audit logs can only be inserted by the system
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- ===========================
-- Grant permissions to application role
-- ===========================
-- Create application role if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user;
  END IF;
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO app_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- ===========================
-- Helper function for setting session variables
-- ===========================
CREATE OR REPLACE FUNCTION set_app_context(
  p_tenant_id UUID,
  p_user_id UUID,
  p_user_role TEXT
) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, true);
  PERFORM set_config('app.user_id', p_user_id::TEXT, true);
  PERFORM set_config('app.user_role', p_user_role, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_app_context IS 'アプリケーションのセッションコンテキストを設定する関数';