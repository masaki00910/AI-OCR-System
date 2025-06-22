import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add,
  Delete,
  ExpandMore,
  Code,
  Preview,
} from '@mui/icons-material';

interface JsonSchemaEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

interface SchemaProperty {
  type: string;
  description?: string;
  format?: string;
  required?: boolean;
  items?: SchemaProperty;
  properties?: { [key: string]: SchemaProperty };
}

const JsonSchemaEditor: React.FC<JsonSchemaEditorProps> = ({ value, onChange, error }) => {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [schema, setSchema] = useState<any>({});
  const [properties, setProperties] = useState<{ [key: string]: SchemaProperty }>({});
  const [required, setRequired] = useState<string[]>([]);
  const [editingKeys, setEditingKeys] = useState<{ [oldKey: string]: string }>({});

  useEffect(() => {
    try {
      const parsed = JSON.parse(value);
      setSchema(parsed);
      setProperties(parsed.properties || {});
      setRequired(parsed.required || []);
    } catch {
      // Keep current state if JSON is invalid
    }
  }, [value]);

  const updateSchema = (newProperties: { [key: string]: SchemaProperty }, newRequired: string[]) => {
    const newSchema = {
      ...schema,
      type: 'object',
      properties: newProperties,
      required: newRequired.length > 0 ? newRequired : undefined,
    };
    
    setProperties(newProperties);
    setRequired(newRequired);
    onChange(JSON.stringify(newSchema, null, 2));
  };

  const addProperty = () => {
    const newKey = `field_${Object.keys(properties).length + 1}`;
    const newProperties = {
      ...properties,
      [newKey]: {
        type: 'string',
        description: '新しいフィールド',
      },
    };
    updateSchema(newProperties, required);
  };

  const updateProperty = (key: string, property: SchemaProperty) => {
    const newProperties = { ...properties, [key]: property };
    updateSchema(newProperties, required);
  };

  const deleteProperty = (key: string) => {
    const newProperties = { ...properties };
    delete newProperties[key];
    const newRequired = required.filter(r => r !== key);
    updateSchema(newProperties, newRequired);
  };

  const toggleRequired = (key: string) => {
    const newRequired = required.includes(key)
      ? required.filter(r => r !== key)
      : [...required, key];
    updateSchema(properties, newRequired);
  };

  const renameProperty = (oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey || properties[newKey]) return;
    
    const newProperties = { ...properties };
    newProperties[newKey] = newProperties[oldKey];
    delete newProperties[oldKey];
    
    const newRequired = required.map(r => r === oldKey ? newKey : r);
    updateSchema(newProperties, newRequired);
  };

  // 一時的なキー値変更のハンドラー（フォーカス維持）
  const handleKeyChange = (oldKey: string, newValue: string) => {
    setEditingKeys(prev => ({ ...prev, [oldKey]: newValue }));
  };

  // フォーカスが外れた時の処理（実際のリネーム実行）
  const handleKeyBlur = (oldKey: string) => {
    const newKey = editingKeys[oldKey];
    if (newKey && newKey !== oldKey && newKey.trim() !== '') {
      renameProperty(oldKey, newKey.trim());
    }
    // 編集状態をクリア
    setEditingKeys(prev => {
      const updated = { ...prev };
      delete updated[oldKey];
      return updated;
    });
  };

  // Enterキーでも確定できるようにする
  const handleKeyPress = (oldKey: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleKeyBlur(oldKey);
    }
  };

  const generateExample = () => {
    const example: any = {};
    Object.entries(properties).forEach(([key, prop]) => {
      switch (prop.type) {
        case 'string':
          if (prop.format === 'date') {
            example[key] = '2024-01-01';
          } else if (prop.format === 'email') {
            example[key] = 'example@example.com';
          } else {
            example[key] = `サンプル${key}`;
          }
          break;
        case 'number':
        case 'integer':
          example[key] = 123;
          break;
        case 'boolean':
          example[key] = true;
          break;
        case 'array':
          example[key] = ['要素1', '要素2'];
          break;
        case 'object':
          example[key] = {};
          break;
        default:
          example[key] = null;
      }
    });
    return JSON.stringify(example, null, 2);
  };

  return (
    <Box>
      <Box display="flex" gap={2} mb={2}>
        <Button
          variant={mode === 'visual' ? 'contained' : 'outlined'}
          startIcon={<Preview />}
          onClick={() => setMode('visual')}
        >
          ビジュアル編集
        </Button>
        <Button
          variant={mode === 'code' ? 'contained' : 'outlined'}
          startIcon={<Code />}
          onClick={() => setMode('code')}
        >
          コード編集
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {mode === 'visual' ? (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">フィールド定義</Typography>
            <Button startIcon={<Add />} onClick={addProperty}>
              フィールド追加
            </Button>
          </Box>

          <Grid container spacing={2}>
            {Object.entries(properties).map(([key, property]) => (
              <Grid item xs={12} key={key}>
                <Paper sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="フィールド名"
                        value={editingKeys[key] !== undefined ? editingKeys[key] : key}
                        onChange={(e) => handleKeyChange(key, e.target.value)}
                        onBlur={() => handleKeyBlur(key)}
                        onKeyPress={(e) => handleKeyPress(key, e)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>データ型</InputLabel>
                        <Select
                          value={property.type}
                          onChange={(e) => updateProperty(key, { ...property, type: e.target.value })}
                        >
                          <MenuItem value="string">文字列</MenuItem>
                          <MenuItem value="number">数値</MenuItem>
                          <MenuItem value="integer">整数</MenuItem>
                          <MenuItem value="boolean">真偽値</MenuItem>
                          <MenuItem value="array">配列</MenuItem>
                          <MenuItem value="object">オブジェクト</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {property.type === 'string' && (
                      <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>フォーマット</InputLabel>
                          <Select
                            value={property.format || ''}
                            onChange={(e) => updateProperty(key, { ...property, format: e.target.value || undefined })}
                          >
                            <MenuItem value="">なし</MenuItem>
                            <MenuItem value="date">日付</MenuItem>
                            <MenuItem value="email">メール</MenuItem>
                            <MenuItem value="uri">URL</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="説明"
                        value={property.description || ''}
                        onChange={(e) => updateProperty(key, { ...property, description: e.target.value })}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <Box display="flex" gap={1}>
                        <Chip
                          label="必須"
                          size="small"
                          color={required.includes(key) ? 'primary' : 'default'}
                          onClick={() => toggleRequired(key)}
                          clickable
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <IconButton
                        onClick={() => deleteProperty(key)}
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Accordion sx={{ mt: 3 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>生成される例</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.875rem',
                fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
                margin: 0,
              }}>
                {generateExample()}
              </pre>
            </AccordionDetails>
          </Accordion>
        </Box>
      ) : (
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          multiline
          rows={20}
          sx={{
            '& .MuiInputBase-input': {
              fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
              fontSize: '0.875rem',
            }
          }}
          helperText="JSON Schema形式でフィールド定義を記述してください"
        />
      )}
    </Box>
  );
};

export default JsonSchemaEditor;