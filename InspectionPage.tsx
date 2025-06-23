import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PanTool,
  CropFree,
  ZoomIn,
  ZoomOut,
  Save,
  ArrowBack,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PdfViewer from '../components/PdfViewer';
import { projectApi, documentApi, parcelApi } from '../services/api';
import { getOCRService } from '../services/ocr';
import { TriangleAreaTable, TriangleAreaRow } from '../components/tables/TriangleAreaTable';
import { ParcelAreaTable, ParcelAreaRow } from '../components/tables/ParcelAreaTable';
import { ParcelPointTable, ParcelPointRow } from '../components/tables/ParcelPointTable';
import { AreaDetailTable, AreaDetailRow } from '../components/tables/AreaDetailTable';
import { MultiTableContainer } from '../components/MultiTableContainer';
import { 
  TriangleAreaTableGroup, 
  ParcelAreaTableGroup, 
  ParcelPointTableGroup, 
  AreaDetailTableGroup 
} from '../types/table-types';
import { groupByDuplicateSequence } from '../utils/table-grouping';
import { groupByTableGroupId } from '../utils/table-grouping-by-id';

const PageContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: '#f5f5f5',
});

const MainContent = styled(Box)({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
});

const LeftPane = styled(Box)({
  flex: 1,
  backgroundColor: 'white',
  borderRight: '1px solid #e0e0e0',
  padding: 16,
  overflow: 'auto',
});

const RightPane = styled(Box)({
  width: 600,
  backgroundColor: 'white',
  padding: 16,
  overflow: 'auto',
});

type Mode = 'move' | 'select';
type Status = '未着手' | '点検中' | '完了' | '差戻し';

export default function InspectionPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('move');
  const [status, setStatus] = useState<Status>('未着手');
  const [scale, setScale] = useState(1.0);
  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRectangle, setSelectedRectangle] = useState<any>(null);
  const [selectedTableType, setSelectedTableType] = useState<string>('');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResults, setOcrResults] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [showBackConfirmDialog, setShowBackConfirmDialog] = useState(false);
  
  // 各テーブルのデータ（複数表対応）
  const [triangleAreaTables, setTriangleAreaTables] = useState<TriangleAreaTableGroup[]>([]);
  const [parcelAreaTables, setParcelAreaTables] = useState<ParcelAreaTableGroup[]>([]);
  const [parcelPointTables, setParcelPointTables] = useState<ParcelPointTableGroup[]>([]);
  const [areaDetailTables, setAreaDetailTables] = useState<AreaDetailTableGroup[]>([]);
  
  // データ変更を追跡するカスタムセッター
  const setTriangleAreaTablesWithModified = (tables: TriangleAreaTableGroup[]) => {
    setTriangleAreaTables(tables);
    setIsModified(true);
  };
  
  const setParcelAreaTablesWithModified = (tables: ParcelAreaTableGroup[]) => {
    setParcelAreaTables(tables);
    setIsModified(true);
  };
  
  const setParcelPointTablesWithModified = (tables: ParcelPointTableGroup[]) => {
    setParcelPointTables(tables);
    setIsModified(true);
  };
  
  const setAreaDetailTablesWithModified = (tables: AreaDetailTableGroup[]) => {
    setAreaDetailTables(tables);
    setIsModified(true);
  };
  
  // 筆ポリゴン関連
  const [currentParcelId, setCurrentParcelId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject(parseInt(projectId));
    }
  }, [projectId]);

  const fetchProject = async (id: number) => {
    try {
      const response = await projectApi.get(id);
      setProject(response.data);
      setStatus(response.data.status);
      
      // ドキュメントがある場合は最初のドキュメントを選択
      if (response.data.documents && response.data.documents.length > 0) {
        const doc = response.data.documents[0];
        setSelectedDocument(doc);
        
        // PDFのURLを構築（プロキシ経由）
        const pdfProxyUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/documents/${doc.id}/pages/1`;
        setPdfUrl(pdfProxyUrl);
      }
      
      // 筆ポリゴンを取得または作成
      await fetchOrCreateParcel(id);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: Mode | null,
  ) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const handleStatusChange = async (event: any) => {
    const newStatus = event.target.value;
    setStatus(newStatus);
    
    // APIでステータスを更新
    if (projectId) {
      try {
        await projectApi.update(parseInt(projectId), { status: newStatus });
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
  };

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.1, 3.0));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.1, 0.5));
  };

  const handleSelectionComplete = (rectangle: any) => {
    setSelectedRectangle(rectangle);
    console.log('Selected rectangle:', rectangle);
  };

  const handlePageChange = (pageNumber: number) => {
    console.log('Page changed to:', pageNumber);
    // ページ変更時に選択範囲をクリア
    setSelectedRectangle(null);
    // 表の種類選択もクリア
    setSelectedTableType('');
  };

  const handleAIOCR = async () => {
    if (!selectedRectangle || !selectedTableType) {
      alert('範囲と表の種類を選択してください');
      return;
    }

    setIsProcessingOCR(true);
    try {
      // PDFキャンバスを取得
      const pdfCanvas = document.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
      if (!pdfCanvas) {
        throw new Error('PDFキャンバスが見つかりません');
      }

      // OCRサービスを取得
      const ocrService = getOCRService();

      // 選択範囲の画像を切り出し
      const imageBase64 = await ocrService.extractImageFromPDF(
        pdfCanvas,
        selectedRectangle,
        scale
      );

      // デバッグ: 切り出した画像を確認
      console.log('Extracted image base64 length:', imageBase64.length);
      console.log('First 100 chars:', imageBase64.substring(0, 100));
      
      // プレビュー画像を設定（デバッグ用）
      setPreviewImage(`data:image/png;base64,${imageBase64}`);

      // OCRを実行
      const result = await ocrService.performOCR(imageBase64, selectedTableType);
      
      console.log('OCR Result:', result);
      setOcrResults(result);
      
      // OCR結果を対応するテーブルに新しい表として追加
      const timestamp = new Date().toLocaleString('ja-JP', { 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      if (result.type === 'triangle_area' && result.rows) {
        const triangleData: TriangleAreaRow[] = result.rows.map((row: any, index: number) => ({
          id: `ocr-${Date.now()}-${index}`,
          seq: row.seq || index + 1,
          base_m: row.base_m,
          height_m: row.height_m,
          area_m2: row.area_m2,
        }));
        
        const newTable: TriangleAreaTableGroup = {
          id: `ocr-triangle-${Date.now()}`,
          name: `三角求積表（${timestamp}）`,
          data: triangleData,
          createdAt: new Date(),
          ocrSourceRect: selectedRectangle,
        };
        
        setTriangleAreaTables([...triangleAreaTables, newTable]);
      } else if (result.type === 'parcel_areas' && result.rows) {
        const parcelData: ParcelAreaRow[] = result.rows.map((row: any, index: number) => ({
          id: `ocr-${Date.now()}-${index}`,
          parcel_name: row.parcel_name || row.地番 || '',
          area_m2: row.area_m2 || row.地積 || 0,
          memo: row.memo || row.備考 || '',
        }));
        
        const newTable: ParcelAreaTableGroup = {
          id: `ocr-parcel-${Date.now()}`,
          name: `地積一覧（${timestamp}）`,
          data: parcelData,
          createdAt: new Date(),
          ocrSourceRect: selectedRectangle,
        };
        
        setParcelAreaTables([...parcelAreaTables, newTable]);
      } else if ((result.type === 'boundary_points' || result.type === 'control_points' || result.type === 'reference_points') && result.rows) {
        const pointData: ParcelPointRow[] = result.rows.map((row: any, index: number) => ({
          id: `ocr-${Date.now()}-${index}`,
          point_name: row.point_name || row.点名 || '',
          x_coord: row.x_coord || row.x座標 || row.X || 0,
          y_coord: row.y_coord || row.y座標 || row.Y || 0,
          memo: row.memo || row.備考 || '',
        }));
        
        const tableTypeMap = {
          'boundary_points': '境界点座標一覧',
          'control_points': '基準点座標一覧',
          'reference_points': '引照点座標一覧',
        };
        
        const newTable: ParcelPointTableGroup = {
          id: `ocr-point-${Date.now()}`,
          name: `${tableTypeMap[result.type as keyof typeof tableTypeMap]}（${timestamp}）`,
          data: pointData,
          createdAt: new Date(),
          ocrSourceRect: selectedRectangle,
        };
        
        setParcelPointTables([...parcelPointTables, newTable]);
      } else if (result.type === 'coordinate_area' && result.rows) {
        const areaData: AreaDetailRow[] = result.rows.map((row: any, index: number) => ({
          id: `ocr-${Date.now()}-${index}`,
          detail_name: row.detail_name || row.明細名 || '',
          calculation_formula: row.calculation_formula || row.計算式 || '',
          area_sqm: row.area_sqm || row.面積 || 0,
          memo: row.memo || row.備考 || '',
        }));
        
        const newTable: AreaDetailTableGroup = {
          id: `ocr-detail-${Date.now()}`,
          name: `座標面積求積表（${timestamp}）`,
          data: areaData,
          createdAt: new Date(),
          ocrSourceRect: selectedRectangle,
        };
        
        setAreaDetailTables([...areaDetailTables, newTable]);
      }
      
      // 成功メッセージ
      alert(`OCR完了: ${result.rows.length}件のデータを抽出しました`);
    } catch (error: any) {
      console.error('OCR failed:', error);
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        alert('APIキーが設定されていません。バックエンドの.envファイルにANTHROPIC_API_KEYを設定してください。');
      } else {
        alert(`OCR処理に失敗しました: ${error.message}`);
      }
    } finally {
      setIsProcessingOCR(false);
    }
  };
  
  const fetchOrCreateParcel = async (projectId: number) => {
    console.log('fetchOrCreateParcel called with projectId:', projectId);
    try {
      // プロジェクトの筆ポリゴンを取得
      const response = await parcelApi.getByProject(projectId);
      const parcels = response.data;
      console.log('Fetched parcels:', parcels);
      
      if (parcels && parcels.length > 0) {
        // 既存の筆ポリゴンがある場合
        console.log('Found parcels:', parcels.map(p => ({ id: p.id, name: p.name })));
        
        // データを持つ筆ポリゴンを優先的に選択、なければID最小のものを選択
        let selectedParcel = parcels[0];
        for (const parcel of parcels) {
          const hasData = (parcel.areaDetails && parcel.areaDetails.length > 0) ||
                         (parcel.parcelAreas && parcel.parcelAreas.length > 0) ||
                         (parcel.parcelPoints && parcel.parcelPoints.length > 0);
          if (hasData) {
            selectedParcel = parcel;
            break;
          }
        }
        
        console.log('Selected parcel ID:', selectedParcel.id);
        setCurrentParcelId(selectedParcel.id);
        
        // 既存データをセット（複数表対応）
        if (selectedParcel.areaDetails && selectedParcel.areaDetails.length > 0) {
          console.log('Raw areaDetails from API:', selectedParcel.areaDetails);
          const triangleData = selectedParcel.areaDetails
            .filter((d: any) => {
              console.log('Filtering detail:', d, 'detailType:', d.detailType, 'detail_type:', d.detail_type);
              return d.detailType === 'triangle' || d.detail_type === 'triangle';
            })
            .map((d: any) => ({
              id: `area-${d.id}`,
              seq: d.seq || 0,
              base_m: d.base_m || d.baseM || null,
              height_m: d.height_m || d.heightM || null,
              area_m2: d.area_m2 || d.areaSqm || null,
              tableGroupId: d.tableGroupId || d.table_group_id || 1,
            }));
          
          // tableGroupIdに基づいてグループ化
          if (triangleData.length > 0) {
            const groupedData = groupByTableGroupId(triangleData);
            const tables: TriangleAreaTableGroup[] = groupedData.map((group, index) => ({
              id: `existing-triangle-${group[0].tableGroupId || Date.now()}-${index}`,
              name: `三角求積表${groupedData.length > 1 ? `（${index + 1}）` : '（既存）'}`,
              data: group,
            }));
            setTriangleAreaTables(tables);
            console.log('Loaded triangle data as', tables.length, 'table(s)');
          }
          
          // 座標面積求積表のデータを処理
          const coordinateData = selectedParcel.areaDetails
            .filter((d: any) => d.detailType === 'coordinate' || d.detail_type === 'coordinate')
            .map((d: any) => ({
              id: `coord-${d.id}`,
              seq: d.seq || 0,
              detail_name: d.detailName || d.detail_name || '',
              calculation_formula: d.calculationFormula || d.calculation_formula || '',
              area_sqm: d.areaSqm || d.area_sqm || 0,
              memo: d.memo || '',
              tableGroupId: d.tableGroupId || d.table_group_id || 1,
            }));
          
          if (coordinateData.length > 0) {
            const groupedData = groupByTableGroupId(coordinateData);
            const tables: AreaDetailTableGroup[] = groupedData.map((group, index) => ({
              id: `existing-detail-${group[0].tableGroupId || Date.now()}-${index}`,
              name: `座標面積求積表${groupedData.length > 1 ? `（${index + 1}）` : '（既存）'}`,
              data: group,
            }));
            setAreaDetailTables(tables);
            console.log('Loaded coordinate area data as', tables.length, 'table(s)');
          }
        } else {
          console.log('No areaDetails found for parcel:', selectedParcel.id);
        }
        
        if (selectedParcel.parcelAreas && selectedParcel.parcelAreas.length > 0) {
          const areaData = selectedParcel.parcelAreas.map((a: any) => ({
            id: `area-${a.id}`,
            seq: a.seq || 0,
            parcel_name: a.parcelName || '',
            area_m2: a.area_m2 || a.areaSqm || 0,
            memo: a.remarks || a.memo || '',
            tableGroupId: a.tableGroupId || a.table_group_id || 1,
          }));
          
          // tableGroupIdに基づいてグループ化
          if (areaData.length > 0) {
            const groupedData = groupByTableGroupId(areaData);
            const tables: ParcelAreaTableGroup[] = groupedData.map((group, index) => ({
              id: `existing-parcel-${group[0].tableGroupId || Date.now()}-${index}`,
              name: `地積一覧${groupedData.length > 1 ? `（${index + 1}）` : '（既存）'}`,
              data: group,
            }));
            setParcelAreaTables(tables);
            console.log('Loaded parcel area data as', tables.length, 'table(s)');
          }
        }
        
        if (selectedParcel.parcelPoints && selectedParcel.parcelPoints.length > 0) {
          const pointData = selectedParcel.parcelPoints.map((p: any) => ({
            id: `point-${p.id}`,
            seq: p.seq || 0,
            point_name: p.ptName || p.pointName || '',
            x_coord: p.x || p.xCoord || 0,
            y_coord: p.y || p.yCoord || 0,
            memo: p.memo || '',
            tableGroupId: p.tableGroupId || p.table_group_id || 1,
          }));
          
          // tableGroupIdに基づいてグループ化
          if (pointData.length > 0) {
            const groupedData = groupByTableGroupId(pointData);
            const tables: ParcelPointTableGroup[] = groupedData.map((group, index) => ({
              id: `existing-point-${group[0].tableGroupId || Date.now()}-${index}`,
              name: `境界点座標一覧${groupedData.length > 1 ? `（${index + 1}）` : '（既存）'}`,
              data: group,
            }));
            setParcelPointTables(tables);
            console.log('Loaded parcel point data as', tables.length, 'table(s)');
          }
        }
        
        // 既存データを読み込んだ場合は変更フラグをリセット
        setIsModified(false);
      } else {
        // 新規作成
        console.log('No parcels found, creating new one...');
        const response = await parcelApi.create(projectId, 'デフォルト筆');
        console.log('Created parcel:', response.data);
        setCurrentParcelId(response.data.id);
      }
    } catch (error: any) {
      console.error('Failed to fetch or create parcel:', error);
      console.error('Error details:', error.response?.data);
      alert(`筆ポリゴンの取得または作成に失敗しました: ${error.response?.data?.message || error.message}`);
    }
  };
  
  const handleSaveData = async () => {
    if (!currentParcelId) {
      alert('筆ポリゴンが選択されていません');
      return;
    }
    
    console.log('=== 保存処理開始 ===');
    console.log('Current Parcel ID:', currentParcelId);
    console.log('Triangle Area Tables:', triangleAreaTables);
    
    setIsSaving(true);
    try {
      // 複数表のデータを単一配列に統合（各表のseq番号とtableGroupIdを保持）
      const allTriangleData = triangleAreaTables.flatMap((table, tableIndex) => {
        // tableGroupIdは、既存データのIDから抽出するか、新規の場合はUnixタイムスタンプ（秒）を使用
        const tableGroupId = table.id.includes('existing-triangle-') 
          ? parseInt(table.id.replace('existing-triangle-', '').split('-')[0]) 
          : Math.floor(Date.now() / 1000) + tableIndex;
        
        return table.data.map((item, itemIndex) => ({
          ...item,
          seq: item.seq || itemIndex + 1,
          tableGroupId,
        }));
      });
      
      const allParcelAreaData = parcelAreaTables.flatMap((table, tableIndex) => {
        const tableGroupId = table.id.includes('existing-parcel-') 
          ? parseInt(table.id.replace('existing-parcel-', '').split('-')[0])
          : Math.floor(Date.now() / 1000) + tableIndex;
        
        return table.data.map((item, itemIndex) => ({
          ...item,
          seq: item.seq || itemIndex + 1,
          tableGroupId,
        }));
      });
      
      const allParcelPointData = parcelPointTables.flatMap((table, tableIndex) => {
        const tableGroupId = table.id.includes('existing-point-') 
          ? parseInt(table.id.replace('existing-point-', '').split('-')[0])
          : Math.floor(Date.now() / 1000) + tableIndex;
        
        return table.data.map((item, itemIndex) => ({
          ...item,
          seq: item.seq || itemIndex + 1,
          tableGroupId,
        }));
      });
      
      const allAreaDetailData = areaDetailTables.flatMap((table, tableIndex) => {
        const tableGroupId = table.id.includes('existing-detail-') 
          ? parseInt(table.id.replace('existing-detail-', '').split('-')[0])
          : Math.floor(Date.now() / 1000) + tableIndex;
        
        return table.data.map((item, itemIndex) => ({
          ...item,
          seq: item.seq || itemIndex + 1,
          tableGroupId,
        }));
      });
      
      // データを変換
      const saveData = {
        parcelAreas: allParcelAreaData.map(area => ({
          parcelName: area.parcel_name,
          areaSqm: parseFloat(area.area_m2.toString()),
          memo: area.memo || '',
          seq: area.seq,
          tableGroupId: area.tableGroupId,
        })),
        parcelPoints: allParcelPointData.map(point => ({
          pointName: point.point_name,
          pointType: 'boundary', // TODO: タイプを選択できるようにする
          xCoord: parseFloat(point.x_coord.toString()),
          yCoord: parseFloat(point.y_coord.toString()),
          memo: point.memo || '',
          seq: point.seq,
          tableGroupId: point.tableGroupId,
        })),
        areaDetails: [
          ...allTriangleData.map(area => ({
            detailType: 'triangle',
            detailName: `三角求積 ${area.seq}`,
            calculationFormula: `${area.base_m} × ${area.height_m} ÷ 2`,
            areaSqm: parseFloat(area.area_m2?.toString() || '0'),
            seq: area.seq,
            tableGroupId: area.tableGroupId,
            baseM: area.base_m ? parseFloat(area.base_m.toString()) : null,
            heightM: area.height_m ? parseFloat(area.height_m.toString()) : null,
            memo: '',
          })),
          ...allAreaDetailData.map(detail => ({
            detailType: 'coordinate',
            detailName: detail.detail_name,
            calculationFormula: detail.calculation_formula,
            areaSqm: parseFloat(detail.area_sqm.toString()),
            memo: detail.memo || '',
            seq: detail.seq,
            tableGroupId: detail.tableGroupId,
          })),
        ],
      };
      
      console.log('保存するデータ:', saveData);
      const saveResponse = await parcelApi.saveData(currentParcelId, saveData);
      console.log('保存レスポンス:', saveResponse);
      alert('データを保存しました');
      setIsModified(false); // 保存成功時にフラグをリセット
    } catch (error: any) {
      console.error('Failed to save data:', error);
      alert(`保存に失敗しました: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleBackClick = () => {
    if (isModified) {
      setShowBackConfirmDialog(true);
    } else {
      navigate('/projects');
    }
  };
  
  const handleBackConfirm = () => {
    setShowBackConfirmDialog(false);
    navigate('/projects');
  };
  
  const handleBackCancel = () => {
    setShowBackConfirmDialog(false);
  };
  
  // 表数と件数を計算するヘルパー関数
  const getTableSummary = (tables: any[]) => {
    const tableCount = tables.length;
    const totalRecords = tables.reduce((sum, table) => sum + (table.data?.length || 0), 0);
    return { tableCount, totalRecords };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 0, mr: 4 }}>
            {project?.name || `案件ID: ${projectId}`}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              size="small"
            >
              <ToggleButton value="select" aria-label="範囲選択">
                <CropFree sx={{ mr: 1 }} />
                範囲選択
              </ToggleButton>
              <ToggleButton value="move" aria-label="移動">
                <PanTool sx={{ mr: 1 }} />
                移動
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={status}
                label="ステータス"
                onChange={handleStatusChange}
              >
                <MenuItem value="未着手">未着手</MenuItem>
                <MenuItem value="点検中">点検中</MenuItem>
                <MenuItem value="完了">完了</MenuItem>
                <MenuItem value="差戻し">差戻し</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              startIcon={<Save />} 
              size="small"
              onClick={handleSaveData}
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={20} /> : '保存'}
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<ArrowBack />} 
              size="small"
              onClick={handleBackClick}
            >
              戻る
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <MainContent>
        <LeftPane>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                {Math.round(scale * 100)}%
              </Typography>
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Box>
            
            {/* PDFビューアーエリア */}
            <Box
              sx={{
                flex: 1,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                overflow: 'auto',
                backgroundColor: '#fafafa',
              }}
            >
              <PdfViewer
                file={pdfUrl}
                scale={scale}
                mode={mode}
                onSelectionComplete={handleSelectionComplete}
                onPageChange={handlePageChange}
              />
            </Box>

            {/* AI-OCR読込ボタン */}
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedRectangle && (
                <FormControl size="small" fullWidth>
                  <InputLabel>表の種類</InputLabel>
                  <Select
                    value={selectedTableType}
                    label="表の種類"
                    onChange={(e) => setSelectedTableType(e.target.value)}
                  >
                    <MenuItem value="">選択してください</MenuItem>
                    <MenuItem value="parcel_areas">地積一覧</MenuItem>
                    <MenuItem value="boundary_points">境界点座標一覧</MenuItem>
                    <MenuItem value="control_points">基準点座標一覧</MenuItem>
                    <MenuItem value="reference_points">引照点座標一覧</MenuItem>
                    <MenuItem value="triangle_area">三斜求積表</MenuItem>
                    <MenuItem value="coordinate_area">座標面積求積表</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={handleAIOCR}
                disabled={!selectedRectangle || !selectedTableType || isProcessingOCR}
              >
                {isProcessingOCR ? <CircularProgress size={20} /> : 'AI-OCR読込'}
              </Button>
            </Box>
            
            {/* デバッグ用: 選択範囲のプレビュー */}
            {previewImage && (
              <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="caption" display="block" gutterBottom>
                  OCRに送信される画像:
                </Typography>
                <img 
                  src={previewImage} 
                  alt="OCR Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    border: '1px solid #ccc'
                  }} 
                />
              </Box>
            )}
          </Box>
        </LeftPane>

        <RightPane>
          <Typography variant="h6" gutterBottom>
            データテーブル
          </Typography>
          
          {/* 編集可能なテーブル（複数表対応） */}
          <Box sx={{ mt: 2 }}>
            {/* 三角求積表 */}
            <Accordion defaultExpanded={triangleAreaTables.length > 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  三角求積表
                  {(() => {
                    const { tableCount, totalRecords } = getTableSummary(triangleAreaTables);
                    return tableCount > 0 ? `（${tableCount}表・${totalRecords}件）` : '';
                  })()}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <MultiTableContainer
                  title=""
                  tables={triangleAreaTables}
                  onTablesChange={setTriangleAreaTablesWithModified}
                  renderTable={(data, onChange) => (
                    <TriangleAreaTable
                      data={data}
                      onDataChange={onChange}
                    />
                  )}
                  getEmptyTable={() => ({
                    id: `new-triangle-${Date.now()}`,
                    name: `三角求積表（新規）`,
                    data: [],
                  })}
                />
              </AccordionDetails>
            </Accordion>
            
            {/* 地積一覧 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  地積一覧
                  {(() => {
                    const { tableCount, totalRecords } = getTableSummary(parcelAreaTables);
                    return tableCount > 0 ? `（${tableCount}表・${totalRecords}件）` : '';
                  })()}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <MultiTableContainer
                  title=""
                  tables={parcelAreaTables}
                  onTablesChange={setParcelAreaTablesWithModified}
                  renderTable={(data, onChange) => (
                    <ParcelAreaTable
                      data={data}
                      onDataChange={onChange}
                    />
                  )}
                  getEmptyTable={() => ({
                    id: `new-parcel-${Date.now()}`,
                    name: `地積一覧（新規）`,
                    data: [],
                  })}
                />
              </AccordionDetails>
            </Accordion>
            
            {/* 境界点・基準点・引照点 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  境界点・基準点・引照点
                  {(() => {
                    const { tableCount, totalRecords } = getTableSummary(parcelPointTables);
                    return tableCount > 0 ? `（${tableCount}表・${totalRecords}件）` : '';
                  })()}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <MultiTableContainer
                  title=""
                  tables={parcelPointTables}
                  onTablesChange={setParcelPointTablesWithModified}
                  renderTable={(data, onChange) => (
                    <ParcelPointTable
                      data={data}
                      onDataChange={onChange}
                    />
                  )}
                  getEmptyTable={() => ({
                    id: `new-point-${Date.now()}`,
                    name: `境界点座標一覧（新規）`,
                    data: [],
                  })}
                />
              </AccordionDetails>
            </Accordion>
            
            {/* 求積明細 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  求積明細
                  {(() => {
                    const { tableCount, totalRecords } = getTableSummary(areaDetailTables);
                    return tableCount > 0 ? `（${tableCount}表・${totalRecords}件）` : '';
                  })()}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <MultiTableContainer
                  title=""
                  tables={areaDetailTables}
                  onTablesChange={setAreaDetailTablesWithModified}
                  renderTable={(data, onChange) => (
                    <AreaDetailTable
                      data={data}
                      onDataChange={onChange}
                    />
                  )}
                  getEmptyTable={() => ({
                    id: `new-detail-${Date.now()}`,
                    name: `求積明細（新規）`,
                    data: [],
                  })}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        </RightPane>
      </MainContent>
      
      {/* 戻る確認ダイアログ */}
      <Dialog
        open={showBackConfirmDialog}
        onClose={handleBackCancel}
      >
        <DialogTitle>未保存のデータがあります</DialogTitle>
        <DialogContent>
          保存されていない変更があります。本当に戻りますか？
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBackCancel}>キャンセル</Button>
          <Button onClick={handleBackConfirm} color="warning">
            保存せずに戻る
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}