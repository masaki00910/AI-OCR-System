-- ENUM型の定義
CREATE TYPE parcel_points_pointtype_enum AS ENUM ('boundary', 'control', 'reference');
CREATE TYPE area_details_detailtype_enum AS ENUM ('triangle', 'coordinate');

-- 1. projects テーブル
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '未着手' CHECK (status IN ('未着手','点検中','完了','差戻し')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. documents テーブル
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  page_count INTEGER,
  version SMALLINT NOT NULL DEFAULT 1,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. parcels テーブル
CREATE TABLE parcels (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  geom GEOMETRY(POLYGON,6677),
  tags TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  survey_date DATE,
  created_by INTEGER,
  name VARCHAR,
  "surveyDate" DATE,
  "createdBy" INTEGER,
  project_id INTEGER,
  polygon GEOMETRY(POLYGON,4326),
  "projectId" INTEGER REFERENCES projects(id),
  lot_no VARCHAR
);
CREATE INDEX gist_parcels_geom ON parcels USING GIST (geom);

-- 4. parcel_areas テーブル（地積一覧）
CREATE TABLE parcel_areas (
  id SERIAL PRIMARY KEY,
  parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  version SMALLINT NOT NULL DEFAULT 1,
  area_m2 NUMERIC(12,3) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  "parcelName" VARCHAR NOT NULL,
  memo VARCHAR,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "parcelId" INTEGER REFERENCES parcels(id),
  source VARCHAR,
  remarks VARCHAR,
  seq INTEGER,
  table_group_id INTEGER
);

-- 5. parcel_points テーブル（点一覧）
CREATE TABLE parcel_points (
  id SERIAL PRIMARY KEY,
  parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  x NUMERIC(12,3),
  y NUMERIC(12,3),
  geom GEOMETRY(POINT,6677),
  "pointName" VARCHAR NOT NULL,
  "pointType" parcel_points_pointtype_enum NOT NULL DEFAULT 'boundary',
  "xCoord" NUMERIC(10,3) NOT NULL,
  "yCoord" NUMERIC(10,3) NOT NULL,
  memo VARCHAR,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "parcelId" INTEGER REFERENCES parcels(id),
  pt_name VARCHAR,
  role VARCHAR,
  marker_type VARCHAR,
  seq INTEGER,
  table_group_id INTEGER
);
CREATE INDEX gist_points_geom ON parcel_points USING GIST (geom);

-- 6. area_details テーブル（求積明細）
CREATE TABLE area_details (
  id SERIAL PRIMARY KEY,
  parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  base_m NUMERIC(10,3),
  height_m NUMERIC(10,3),
  x NUMERIC(12,3),
  y NUMERIC(12,3),
  next_x NUMERIC(12,3),
  next_y NUMERIC(12,3),
  twice_area NUMERIC(15,3),
  area_m2 NUMERIC(12,3),
  "detailType" area_details_detailtype_enum NOT NULL DEFAULT 'triangle',
  "detailName" VARCHAR NOT NULL,
  "calculationFormula" VARCHAR,
  "areaSqm" NUMERIC(10,3) NOT NULL,
  memo VARCHAR,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "parcelId" INTEGER REFERENCES parcels(id),
  method VARCHAR,
  seq INTEGER,
  table_group_id INTEGER
);

-- 7. audit_logs テーブル（監査ログ）
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- 外部キー制約名を指定して追加
ALTER TABLE documents ADD CONSTRAINT "FK_e156b298c20873e14c362e789bf" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE parcels ADD CONSTRAINT "FK_5ae8c66fa8e93f2a606dcc8b280" FOREIGN KEY ("projectId") REFERENCES projects(id);
ALTER TABLE parcels ADD CONSTRAINT "FK_a9ab4f9ac8150b455453276ef65" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE parcel_areas ADD CONSTRAINT "FK_83d4f988a36b7faef6913a084fc" FOREIGN KEY ("parcelId") REFERENCES parcels(id);
ALTER TABLE parcel_areas ADD CONSTRAINT "FK_e36b14049b8f56d43a6f9a7ad27" FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE CASCADE;
ALTER TABLE parcel_points ADD CONSTRAINT "FK_41cc3b47cba2af3897e5fe3c42e" FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE CASCADE;
ALTER TABLE parcel_points ADD CONSTRAINT "FK_6acb9b9e8380b17e0819dfc01b1" FOREIGN KEY ("parcelId") REFERENCES parcels(id);
ALTER TABLE area_details ADD CONSTRAINT "FK_5fae5574a628932ed6e8cbd1def" FOREIGN KEY ("parcelId") REFERENCES parcels(id);
ALTER TABLE area_details ADD CONSTRAINT "FK_eec90bb4a5394e07bad0fe2d5b7" FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE CASCADE;

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();