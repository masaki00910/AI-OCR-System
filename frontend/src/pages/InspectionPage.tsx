import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

export default function InspectionPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/documents')}
          sx={{ mr: 2 }}
        >
          戻る
        </Button>
        <Typography variant="h4" component="h1">
          ドキュメント点検
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        ドキュメントID: {documentId}
      </Alert>

      <Alert severity="warning">
        この画面は現在開発中です。汎用ドキュメント点検機能を実装予定です。
        <br />
        現在はテンプレート管理とドキュメントアップロード機能をお試しください。
      </Alert>
    </Container>
  );
}