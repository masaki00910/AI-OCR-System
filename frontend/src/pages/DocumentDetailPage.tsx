import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  PanTool as PanToolIcon,
  CropFree as SelectionIcon,
  PlayArrow as PlayArrowIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  BugReport as BugReportIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { api, documentApi } from '../services/api';
import OcrResultEditor from '../components/OcrResultEditor';
import ApprovalSection from '../components/ApprovalSection';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  pageCount: number;
  templateId: string;
  template?: {
    name: string;
    blocks?: BlockDefinition[];
  };
  createdAt: string;
}

interface BlockDefinition {
  block_id: string;
  label: string;
  prompt?: string;
  schema: any;
}

interface SelectedBlock {
  blockId: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  extractionResult?: any;
  extractionId?: string;
  croppedImageUrl?: string;
  rawResponse?: string;
  isProcessing?: boolean;
}

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [currentBlockType, setCurrentBlockType] = useState<string>('');
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'pan' | 'selection'>('pan');
  
  // 新機能のステート
  const [autoOcr, setAutoOcr] = useState(true);
  const [debugPreviewOpen, setDebugPreviewOpen] = useState(false);
  const [debugData, setDebugData] = useState<{
    croppedImage?: string;
    rawResponse?: string;
    blockLabel?: string;
  } | null>(null);
  const [selectionPreview, setSelectionPreview] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<SelectedBlock | null>(null);
  const [showJsonView, setShowJsonView] = useState<{ [blockId: string]: boolean }>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<SelectedBlock | null>(null);

  useEffect(() => {
    console.log('DocumentDetailPage useEffect triggered, id:', id);
    fetchDocument();
  }, [id]);

  useEffect(() => {
    if (document?.id) {
      console.log('Document loaded, fetching page image for page:', currentPage);
      fetchPageImage();
      // 既存の抽出結果をロード
      fetchExistingExtractions();
    }
  }, [document, currentPage]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pageImageUrl) {
        URL.revokeObjectURL(pageImageUrl);
      }
    };
  }, [pageImageUrl]);

  const fetchDocument = async () => {
    console.log('fetchDocument called with id:', id);
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/documents/${id}`);
      console.log('Document API response:', response.data);
      setDocument(response.data);
      
      // テンプレート情報も取得
      if (response.data.templateId) {
        const templateResponse = await api.get(`/api/v1/templates/${response.data.templateId}`);
        setDocument({
          ...response.data,
          template: templateResponse.data,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'ドキュメントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchPageImage = async () => {
    console.log('fetchPageImage called, document:', document, 'currentPage:', currentPage);
    if (!document?.id) {
      console.log('No document ID, skipping image fetch');
      return;
    }

    try {
      setImageLoading(true);
      setImageError(null);
      
      // Cleanup previous image URL
      if (pageImageUrl) {
        URL.revokeObjectURL(pageImageUrl);
        setPageImageUrl(null);
      }

      console.log('Fetching page image:', `/api/v1/documents/${document.id}/pages/${currentPage}`);
      const response = await api.get(`/api/v1/documents/${document.id}/pages/${currentPage}`, {
        responseType: 'blob'
      });
      
      // Create blob URL for image display
      const blob = new Blob([response.data], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);
      
      console.log('Image blob created, URL:', imageUrl);
      setPageImageUrl(imageUrl);
    } catch (err: any) {
      console.error('Failed to fetch page image:', err);
      setImageError(err.response?.data?.message || 'ページ画像の取得に失敗しました');
    } finally {
      setImageLoading(false);
    }
  };

  const fetchExistingExtractions = async () => {
    if (!document?.id) {
      console.log('No document ID, skipping extraction fetch');
      return;
    }

    try {
      console.log('Fetching existing extractions for document:', document.id);
      const response = await api.get(`/api/v1/ocr/documents/${document.id}/extractions`);
      const extractions = response.data;
      
      console.log('Existing extractions found:', extractions);

      if (extractions && extractions.length > 0) {
        // 既存の抽出結果をSelectedBlock形式に変換
        const existingBlocks: SelectedBlock[] = extractions.map((extraction: any) => ({
          blockId: extraction.blockId,
          coordinates: extraction.coordinates,
          extractionResult: extraction.extractedData || extraction.content, // extracted_dataを優先、なければcontentを使用
          extractionId: extraction.id,
          isProcessing: false,
        }));

        console.log('Setting existing blocks:', existingBlocks);
        setSelectedBlocks(existingBlocks);
      }
    } catch (err: any) {
      console.error('Failed to fetch existing extractions:', err);
      // エラーは表示しない（既存データがない場合は正常）
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (document) {
      setCurrentPage(prev => Math.min(prev + 1, document.pageCount));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 範囲選択モードかつブロックタイプが選択されている場合のみ範囲選択を開始
    if (interactionMode !== 'selection' || !currentBlockType) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    
    // イベント伝播を停止して、他のイベントハンドラーとの競合を防ぐ
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart || interactionMode !== 'selection') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionEnd({ x, y });
    
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseUp = async (e?: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart || !selectionEnd || !currentBlockType || interactionMode !== 'selection') return;
    
    // 表示座標を取得
    const displayCoordinates = {
      x: Math.min(selectionStart.x, selectionEnd.x),
      y: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
    };
    
    // 画像要素を取得（window.documentを明示的に使用）
    const imgElement = window.document.querySelector(`img[src="${pageImageUrl}"]`) as HTMLImageElement;
    if (!imgElement) {
      console.error('Image element not found');
      return;
    }
    
    // 地積測量AI-OCR方式の座標変換
    // 実際の画像サイズ（ナチュラルサイズ）
    const imageWidth = imgElement.naturalWidth;
    const imageHeight = imgElement.naturalHeight;
    
    // 表示サイズ
    const displayWidth = imgElement.clientWidth;
    const displayHeight = imgElement.clientHeight;
    
    // スケール比を計算（地積測量AI-OCR方式）
    const scaleX = imageWidth / displayWidth;
    const scaleY = imageHeight / displayHeight;
    
    console.log('Image natural size:', imageWidth, 'x', imageHeight);
    console.log('Image display size:', displayWidth, 'x', displayHeight);
    console.log('Scale ratios (地積測量AI-OCR方式):', scaleX, scaleY);
    console.log('Display coordinates:', displayCoordinates);
    
    // 選択範囲を実際の画像座標に変換（地積測量AI-OCR方式）
    const coordinates = {
      x: displayCoordinates.x * scaleX,
      y: displayCoordinates.y * scaleY,
      width: displayCoordinates.width * scaleX,
      height: displayCoordinates.height * scaleY,
    };
    
    console.log('Actual coordinates (地積測量AI-OCR方式):', coordinates);
    
    // 最小サイズチェック（実際の画像座標で）
    if (coordinates.width > 50 && coordinates.height > 50) {
      const newBlock: SelectedBlock = {
        blockId: currentBlockType,
        coordinates,
        isProcessing: true,
      };
      
      // 選択範囲のプレビュー画像を生成（削除予定）
      // const preview = await generateCroppedImage(coordinates);
      // setSelectionPreview(preview);
      
      // 新しいブロックを追加（既存ブロックは保持）
      setSelectedBlocks(prev => [...prev, newBlock]);
      
      // 自動OCRが有効な場合のみ実行
      if (autoOcr) {
        performOCR(newBlock);
      }
    }
    
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const performOCR = async (block: SelectedBlock) => {
    try {
      // 処理中ステートを更新
      setSelectedBlocks(prev => 
        prev.map(b => 
          b === block ? { ...b, isProcessing: true } : b
        )
      );

      // クロップされた画像を生成（デバッグ用）
      let croppedImageUrl = '';
      if (pageImageUrl) {
        console.log('Generating cropped image with coordinates:', block.coordinates);
        croppedImageUrl = await generateCroppedImage(block.coordinates);
        console.log('Generated cropped image (地積測量AI-OCR方式) - data URL length:', croppedImageUrl.length);
        
        // Base64部分の長さもログ出力
        const base64Part = croppedImageUrl.startsWith('data:image/png;base64,') 
          ? croppedImageUrl.split(',')[1]
          : croppedImageUrl;
        console.log('Base64 image length for OCR:', base64Part.length);
      }

      // 地積測量AI-OCR方式でクロップ済み画像をBase64形式で送信
      let imageBase64 = '';
      if (croppedImageUrl) {
        // data:image/png;base64, の部分を削除してBase64のみ抽出
        imageBase64 = croppedImageUrl.startsWith('data:image/png;base64,') 
          ? croppedImageUrl.split(',')[1]
          : croppedImageUrl;
      }
      
      console.log('Sending OCR request with Base64 image (地積測量AI-OCR方式):', {
        imageBase64Length: imageBase64.length,
        blockId: block.blockId,
        coordinates: block.coordinates,
        documentId: document?.id,
        templateId: document?.templateId
      });
      
      console.log('Making OCR API call...');
      const response = await api.post('/api/v1/ocr/extract/block', {
        imageBase64, // クロップ済みのBase64画像データ
        documentId: document?.id,
        templateId: document?.templateId,
        blockId: block.blockId,
        coordinates: block.coordinates,
      });
      
      console.log('OCR Response received:', response);
      console.log('OCR Response data:', response.data);
      console.log('OCR Response status:', response.status);
      
      // 結果を更新（デバッグ情報も含める）
      setSelectedBlocks(prev => {
        const updatedBlocks = prev.map(b => 
          b.blockId === block.blockId && 
          b.coordinates.x === block.coordinates.x && 
          b.coordinates.y === block.coordinates.y ? { 
            ...b, 
            extractionResult: response.data.content,
            extractionId: response.data.extractionId,
            croppedImageUrl,
            rawResponse: JSON.stringify(response.data, null, 2),
            isProcessing: false
          } : b
        );
        console.log('Updated selectedBlocks:', updatedBlocks);
        console.log('First block details:', updatedBlocks[0]);
        console.log('First block extractionResult:', updatedBlocks[0]?.extractionResult);
        console.log('First block isProcessing:', updatedBlocks[0]?.isProcessing);
        return updatedBlocks;
      });
    } catch (err: any) {
      console.error('OCR failed:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // エラーメッセージを設定
      let errorMessage = 'OCR処理中にエラーが発生しました';
      if (err.response?.status === 400) {
        // NestJSのHttpExceptionレスポンス形式に対応
        errorMessage = err.response?.data?.message || '選択された範囲が無効です。文字が含まれる領域を選択してください。';
        console.log('Using 400 error message:', errorMessage);
      }
      
      // エラー時も処理中フラグを解除し、エラーメッセージを設定
      setSelectedBlocks(prev => 
        prev.map(b => 
          b.blockId === block.blockId && 
          b.coordinates.x === block.coordinates.x && 
          b.coordinates.y === block.coordinates.y ? { 
            ...b, 
            isProcessing: false,
            extractionResult: { error: errorMessage },
            rawResponse: JSON.stringify({ error: errorMessage, details: err.response?.data }, null, 2)
          } : b
        )
      );
    }
  };

  // 手動OCR実行（トグルOFF時用）
  const handleManualOCR = (block: SelectedBlock) => {
    performOCR(block);
  };

  // 選択ブロック削除（確認ダイアログ付き）
  const handleDeleteBlock = (blockToDelete: SelectedBlock) => {
    setBlockToDelete(blockToDelete);
    setDeleteConfirmOpen(true);
  };

  // 削除確認後の実際の削除処理
  const confirmDeleteBlock = async () => {
    if (!blockToDelete) return;

    try {
      // バックエンドで論理削除を実行（extractionIdがある場合のみ）
      if (blockToDelete.extractionId) {
        console.log('Deleting extraction with ID:', blockToDelete.extractionId);
        const deleteResponse = await api.delete(`/api/v1/ocr/extractions/${blockToDelete.extractionId}`);
        console.log('Delete response:', deleteResponse.data);
        console.log('Extraction deleted from backend:', blockToDelete.extractionId);
      } else {
        console.warn('No extractionId found for block, only removing from UI');
      }

      // フロントエンドの状態から削除
      setSelectedBlocks(prev => prev.filter(block => 
        !(block.blockId === blockToDelete.blockId && 
          block.coordinates.x === blockToDelete.coordinates.x && 
          block.coordinates.y === blockToDelete.coordinates.y)
      ));

      // 編集中のブロックがこのブロックの場合、編集状態をクリア
      if (editingBlock && editingBlock.blockId === blockToDelete.blockId) {
        setEditingBlock(null);
      }

      // 削除時にプレビューもクリア
      setSelectionPreview(null);
    } catch (error) {
      console.error('Failed to delete extraction:', error);
      // エラーがあってもフロントエンドからは削除する
      setSelectedBlocks(prev => prev.filter(block => 
        !(block.blockId === blockToDelete.blockId && 
          block.coordinates.x === blockToDelete.coordinates.x && 
          block.coordinates.y === blockToDelete.coordinates.y)
      ));
    } finally {
      setDeleteConfirmOpen(false);
      setBlockToDelete(null);
    }
  };

  // JSON表示の切り替え
  const toggleJsonView = (blockId: string) => {
    setShowJsonView(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  // デバッグプレビューを開く
  const handleDebugPreview = (block: SelectedBlock) => {
    const blockDef = document?.template?.blocks?.find(b => b.block_id === block.blockId);
    setDebugData({
      croppedImage: block.croppedImageUrl,
      rawResponse: block.rawResponse,
      blockLabel: blockDef?.label
    });
    setDebugPreviewOpen(true);
  };

  // 点検補正エディターを開く（JSON表示時のみ使用）
  const handleEditOcrResult = (block: SelectedBlock) => {
    // JSON表示を無効にして編集フォームを表示
    setShowJsonView(prev => ({ ...prev, [block.blockId]: false }));
  };

  // OCR結果の修正を保存
  const handleSaveOcrCorrection = async (blockId: string, correctedData: any) => {
    const block = selectedBlocks.find(b => b.blockId === blockId);
    if (!block?.extractionId) {
      throw new Error('抽出IDが見つかりません');
    }

    try {
      const response = await api.patch(`/api/v1/ocr/extractions/${block.extractionId}`, {
        correctedData,
        correctionReason: '手動修正',
      });

      console.log('OCR correction saved:', response.data);

      // ローカルステートを更新
      setSelectedBlocks(prev => 
        prev.map(b => 
          b.blockId === blockId ? { 
            ...b, 
            extractionResult: correctedData,
            // extractionIdは既に持っているはず
          } : b
        )
      );

      setEditingBlock(null);
    } catch (error) {
      console.error('Failed to save OCR correction:', error);
      throw error;
    }
  };

  // クロップされた画像を生成（地積測量AI-OCR方式）
  const generateCroppedImage = async (coordinates: { x: number; y: number; width: number; height: number }): Promise<string> => {
    if (!pageImageUrl) return '';
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const extractCanvas = window.document.createElement('canvas');
        const ctx = extractCanvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        
        // 出力キャンバスのサイズを設定（実際のクロップサイズ）
        extractCanvas.width = coordinates.width;
        extractCanvas.height = coordinates.height;
        
        // 実際の画像から選択範囲を切り出し（座標は既に変換済み）
        ctx.drawImage(
          img,
          coordinates.x, coordinates.y, coordinates.width, coordinates.height,
          0, 0, coordinates.width, coordinates.height
        );
        
        // Base64形式で返す（data:image/png;base64, の部分を含める）
        const dataUrl = extractCanvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.src = pageImageUrl;
    });
  };

  const getSelectionStyle = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) return {};
    
    return {
      position: 'absolute' as const,
      left: Math.min(selectionStart.x, selectionEnd.x),
      top: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
      border: '2px dashed #1976d2',
      backgroundColor: 'rgba(25, 118, 210, 0.1)',
      pointerEvents: 'none' as const,
      zIndex: 1000,
    };
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !document) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error || 'ドキュメントが見つかりません'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box my={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/documents')}
          sx={{ mb: 2 }}
        >
          ドキュメント一覧に戻る
        </Button>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">{document.fileName}</Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  {/* ページナビゲーション */}
                  <Box display="flex" alignItems="center">
                    <Tooltip title="前のページ">
                      <span>
                        <IconButton 
                          onClick={handlePreviousPage} 
                          disabled={currentPage <= 1}
                        >
                          <NavigateBeforeIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Typography component="span" sx={{ mx: 1 }}>
                      {currentPage} / {document.pageCount}
                    </Typography>
                    <Tooltip title="次のページ">
                      <span>
                        <IconButton 
                          onClick={handleNextPage} 
                          disabled={currentPage >= document.pageCount}
                        >
                          <NavigateNextIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                  
                  <Divider orientation="vertical" flexItem />
                  
                  {/* ズームコントロール */}
                  <Box display="flex" alignItems="center">
                    <Tooltip title="ズームアウト">
                      <IconButton onClick={handleZoomOut}>
                        <ZoomOutIcon />
                      </IconButton>
                    </Tooltip>
                    <Typography component="span" sx={{ mx: 1 }}>
                      {Math.round(zoom * 100)}%
                    </Typography>
                    <Tooltip title="ズームイン">
                      <IconButton onClick={handleZoomIn}>
                        <ZoomInIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Divider orientation="vertical" flexItem />
                  
                  {/* モード切り替えコントロール */}
                  <Box display="flex" alignItems="center">
                    <Tooltip title="移動モード">
                      <IconButton 
                        onClick={() => setInteractionMode('pan')}
                        color={interactionMode === 'pan' ? 'primary' : 'default'}
                      >
                        <PanToolIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="範囲選択モード">
                      <IconButton 
                        onClick={() => setInteractionMode('selection')}
                        color={interactionMode === 'selection' ? 'primary' : 'default'}
                      >
                        <SelectionIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Divider orientation="vertical" flexItem />
                  
                  {/* 自動OCRトグル */}
                  <Box display="flex" alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoOcr}
                          onChange={(e) => setAutoOcr(e.target.checked)}
                          size="small"
                        />
                      }
                      label="自動OCR"
                      sx={{ m: 0 }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />
              
              {/* 選択範囲のプレビュー（削除済み） */}

              {/* ドキュメントビューア */}
              <Box
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  maxHeight: '70vh',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                }}
              >
                {imageLoading ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '400px',
                      backgroundColor: 'white',
                      margin: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>画像を読み込み中...</Typography>
                  </Box>
                ) : imageError ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '400px',
                      backgroundColor: 'white',
                      margin: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <Alert severity="error">{imageError}</Alert>
                  </Box>
                ) : pageImageUrl ? (
                  <TransformWrapper
                    disabled={interactionMode === 'selection'}
                    wheel={{ step: 0.05 }}
                    minScale={0.5}
                    maxScale={3}
                    initialScale={1}
                    centerOnInit={true}
                  >
                    <TransformComponent
                      wrapperStyle={{
                        width: '100%',
                        height: '70vh',
                        cursor: interactionMode === 'selection' && currentBlockType 
                          ? 'crosshair' 
                          : interactionMode === 'pan' 
                          ? 'grab' 
                          : 'default',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          display: 'inline-block',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                      >
                        <img
                          src={pageImageUrl}
                          alt={`Page ${currentPage}`}
                          style={{
                            display: 'block',
                            maxWidth: '100%',
                            height: 'auto',
                          }}
                          onLoad={() => {
                            console.log('Page image loaded successfully');
                          }}
                          onError={() => {
                            setImageError('画像の表示に失敗しました');
                          }}
                        />

                        {/* 選択範囲 */}
                        {isSelecting && <Box sx={getSelectionStyle()} />}

                        {/* 既存の選択ブロック */}
                        {selectedBlocks.map((block, index) => {
                          // 実際の座標から表示座標に変換（地積測量AI-OCR方式）
                          const imgElement = window.document.querySelector(`img[src="${pageImageUrl}"]`) as HTMLImageElement;
                          if (!imgElement) return null;
                          
                          // 地積測量AI-OCR方式の座標変換（逆変換）
                          const imageWidth = imgElement.naturalWidth;
                          const imageHeight = imgElement.naturalHeight;
                          const displayWidth = imgElement.clientWidth;
                          const displayHeight = imgElement.clientHeight;
                          
                          const scaleX = imageWidth / displayWidth;
                          const scaleY = imageHeight / displayHeight;
                          
                          const displayCoordinates = {
                            x: block.coordinates.x / scaleX,
                            y: block.coordinates.y / scaleY,
                            width: block.coordinates.width / scaleX,
                            height: block.coordinates.height / scaleY,
                          };
                          
                          return (
                            <Box
                              key={index}
                              sx={{
                                position: 'absolute',
                                left: displayCoordinates.x,
                                top: displayCoordinates.y,
                                width: displayCoordinates.width,
                                height: displayCoordinates.height,
                                border: block.isProcessing ? '2px solid #ff9800' : '2px solid #4caf50',
                                backgroundColor: block.isProcessing 
                                  ? 'rgba(255, 152, 0, 0.1)' 
                                  : 'rgba(76, 175, 80, 0.1)',
                              }}
                            />
                          );
                        })}
                      </Box>
                    </TransformComponent>
                  </TransformWrapper>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '400px',
                      backgroundColor: 'white',
                      position: 'relative',
                      margin: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Typography color="text.secondary">
                      画像が利用できません
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* ページナビゲーション */}
              {document.pageCount > 1 && (
                <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
                  <IconButton onClick={handlePreviousPage} disabled={currentPage === 1}>
                    <NavigateBeforeIcon />
                  </IconButton>
                  <Typography sx={{ mx: 2 }}>
                    {currentPage} / {document.pageCount}
                  </Typography>
                  <IconButton onClick={handleNextPage} disabled={currentPage === document.pageCount}>
                    <NavigateNextIcon />
                  </IconButton>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            {/* ブロック選択パネル */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  範囲ブロック選択
                </Typography>
                {interactionMode === 'selection' && !currentBlockType && (
                  <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
                    範囲選択モードです。抽出したいブロックタイプを選択してください。
                  </Typography>
                )}
                {interactionMode === 'selection' && currentBlockType && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    💡 ヒント：文字が含まれる領域を十分な大きさで選択してください。空白部分だけを選択するとエラーになります。
                  </Typography>
                )}
                {interactionMode === 'pan' && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    移動モードです。画像をパン・ズームできます。
                  </Typography>
                )}
                {document.template?.blocks?.map((block) => (
                  <Button
                    key={block.block_id}
                    variant={currentBlockType === block.block_id ? 'contained' : 'outlined'}
                    fullWidth
                    sx={{ mb: 1 }}
                    onClick={() => {
                      setCurrentBlockType(block.block_id);
                      // ブロックを選択したら自動的に範囲選択モードに切り替え
                      setInteractionMode('selection');
                      // 新しいブロックタイプ選択時にプレビューをクリア
                      setSelectionPreview(null);
                    }}
                  >
                    {block.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* 承認セクション */}
            <Box sx={{ mb: 2 }}>
              <ApprovalSection documentId={document.id} />
            </Box>

            {/* 選択済みブロック一覧 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  抽出結果
                </Typography>
                {selectedBlocks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    範囲を選択すると、ここに結果が表示されます
                  </Typography>
                ) : (
                  selectedBlocks.map((block, index) => {
                    console.log(`Rendering block ${index}:`, block);
                    console.log(`Block isProcessing: ${block.isProcessing}, extractionResult:`, block.extractionResult);
                    const blockDef = document.template?.blocks?.find(b => b.block_id === block.blockId);
                    return (
                      <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2" color="primary">
                              {blockDef?.label}
                            </Typography>
                            {block.extractionId && (
                              <Typography variant="caption" color="success.main" sx={{ 
                                backgroundColor: 'success.light', 
                                px: 1, 
                                borderRadius: 1,
                                fontSize: '0.7rem'
                              }}>
                                保存済み
                              </Typography>
                            )}
                          </Box>
                          <Box>
                            {/* 手動OCRボタン（自動OCRがOFFまたは処理失敗時） */}
                            {(!autoOcr || (!block.extractionResult && !block.isProcessing)) && (
                              <Tooltip title="OCRを実行">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleManualOCR(block)}
                                  disabled={block.isProcessing}
                                >
                                  <PlayArrowIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            {/* 点検補正ボタン（JSON表示時のみ表示） */}
                            {(block.extractionResult && !block.extractionResult.error && !block.isProcessing && showJsonView[block.blockId]) && (
                              <Tooltip title="点検補正">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditOcrResult(block)}
                                  color={block.extractionId ? "primary" : "default"}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            {/* JSON表示/非表示切り替えボタン（点検補正表示時のみ表示） */}
                            {(block.extractionResult && !block.extractionResult.error && !block.isProcessing && !showJsonView[block.blockId]) && (
                              <Tooltip title="JSON表示に切り替え">
                                <IconButton 
                                  size="small" 
                                  onClick={() => toggleJsonView(block.blockId)}
                                  color="default"
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            {/* デバッグプレビューボタン */}
                            {(block.croppedImageUrl || block.rawResponse) && (
                              <Tooltip title="デバッグ情報を表示">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDebugPreview(block)}
                                >
                                  <BugReportIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            {/* 削除ボタン */}
                            <Tooltip title="この選択を削除">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteBlock(block)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        
                        {(() => {
                          console.log(`UI condition check - isProcessing: ${block.isProcessing}, extractionResult: ${!!block.extractionResult}`);
                          
                          if (block.isProcessing) {
                            console.log('Rendering: OCR processing...');
                            return (
                              <Box display="flex" alignItems="center" gap={1}>
                                <CircularProgress size={16} />
                                <Typography variant="body2" color="text.secondary">
                                  OCR処理中...
                                </Typography>
                              </Box>
                            );
                          } else if (block.extractionResult && !block.extractionResult.error) {
                            console.log('Rendering OCR result - showJsonView:', showJsonView[block.blockId]);
                            
                            // JSON表示が有効な場合はJSONを表示、そうでなければデフォルトで編集フォームを表示
                            if (showJsonView[block.blockId]) {
                              return (
                                <pre style={{ 
                                  fontSize: '12px', 
                                  overflow: 'auto', 
                                  maxHeight: '200px',
                                  backgroundColor: '#f5f5f5',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  margin: 0
                                }}>
                                  {JSON.stringify(block.extractionResult, null, 2)}
                                </pre>
                              );
                            } else {
                              // デフォルトで点検補正エディターを表示
                              const blockDef = document?.template?.blocks?.find(b => b.block_id === block.blockId);
                              if (blockDef) {
                                return (
                                  <OcrResultEditor
                                    block={block}
                                    blockDefinition={blockDef}
                                    onSave={handleSaveOcrCorrection}
                                    onCancel={() => {}} // キャンセル機能は無効（常に編集モード）
                                  />
                                );
                              } else {
                                return (
                                  <Typography variant="body2" color="error">
                                    ブロック定義が見つかりません
                                  </Typography>
                                );
                              }
                            }
                          } else if (block.extractionResult?.error) {
                            console.log('Rendering: OCR error:', block.extractionResult.error);
                            return (
                              <Alert severity="error" sx={{ mt: 1 }}>
                                {block.extractionResult.error}
                              </Alert>
                            );
                          } else {
                            console.log('Rendering: Waiting for OCR...');
                            return (
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {autoOcr ? 'OCR実行待機中...' : 'OCRボタンを押してください'}
                                </Typography>
                                {!autoOcr && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => handleManualOCR(block)}
                                    sx={{ mt: 1 }}
                                  >
                                    OCR実行
                                  </Button>
                                )}
                              </Box>
                            );
                          }
                        })()}
                      </Box>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* デバッグプレビューダイアログ */}
      <Dialog 
        open={debugPreviewOpen} 
        onClose={() => setDebugPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          デバッグ情報 - {debugData?.blockLabel}
        </DialogTitle>
        <DialogContent>
          {debugData?.croppedImage && (
            <Box mb={2}>
              <Typography variant="h6" gutterBottom>
                OCR対象画像
              </Typography>
              <img 
                src={debugData.croppedImage} 
                alt="Cropped for OCR" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '300px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }} 
              />
            </Box>
          )}
          
          {debugData?.rawResponse && (
            <Box>
              <Typography variant="h6" gutterBottom>
                API レスポンス（Raw）
              </Typography>
              <pre style={{ 
                fontSize: '12px', 
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                whiteSpace: 'pre-wrap'
              }}>
                {debugData.rawResponse}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDebugPreviewOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          抽出結果の削除確認
        </DialogTitle>
        <DialogContent>
          <Typography>
            この抽出結果を削除してもよろしいですか？
          </Typography>
          {blockToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                ブロック: {document?.template?.blocks?.find(b => b.block_id === blockToDelete.blockId)?.label}
              </Typography>
              {blockToDelete.extractionResult && (
                <Typography variant="body2" color="text.secondary">
                  データ: {JSON.stringify(blockToDelete.extractionResult, null, 2).substring(0, 100)}...
                </Typography>
              )}
            </Box>
          )}
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            ⚠️ この操作は取り消すことができません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={confirmDeleteBlock} color="error" variant="contained">
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DocumentDetailPage;