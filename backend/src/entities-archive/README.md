# アーカイブされたエンティティ

このディレクトリには、土地測量図専用システムで使用されていた旧エンティティが保存されています。

## アーカイブ理由
- 汎用ドキュメント点検補正システムへの移行に伴い、固定スキーマから動的スキーマ（JSON Schema）ベースの設計に変更
- PostGIS依存の除去
- マルチテナント対応

## アーカイブされたエンティティ
- project.entity.ts - プロジェクト管理
- document.entity.ts - ドキュメント管理
- parcel.entity.ts - 土地区画（PostGIS geometry使用）
- parcel-area.entity.ts - 面積情報
- parcel-point.entity.ts - 境界点（PostGIS point使用）
- area-detail.entity.ts - 面積計算詳細

新しいエンティティは親ディレクトリ（src/entities）に配置されています。