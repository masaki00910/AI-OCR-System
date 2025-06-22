import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

interface MultiTableContainerProps<T> {
  title: string;
  tables: { id: string; name: string; data: T[] }[];
  onTablesChange: (tables: { id: string; name: string; data: T[] }[]) => void;
  renderTable: (data: T[], onChange: (data: T[]) => void) => React.ReactNode;
  getEmptyTable: () => { id: string; name: string; data: T[] };
}

export function MultiTableContainer<T>({
  title,
  tables,
  onTablesChange,
  renderTable,
  getEmptyTable,
}: MultiTableContainerProps<T>) {
  const [editingTableId, setEditingTableId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const handleAddTable = () => {
    const newTable = getEmptyTable();
    onTablesChange([...tables, newTable]);
  };

  const handleDeleteTable = (tableId: string) => {
    if (window.confirm('この表を削除してもよろしいですか？')) {
      onTablesChange(tables.filter(table => table.id !== tableId));
    }
  };

  const handleTableDataChange = (tableId: string, newData: T[]) => {
    onTablesChange(
      tables.map(table =>
        table.id === tableId ? { ...table, data: newData } : table
      )
    );
  };

  const handleStartEditName = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setEditingName(currentName);
  };

  const handleSaveName = (tableId: string) => {
    onTablesChange(
      tables.map(table =>
        table.id === tableId ? { ...table, name: editingName } : table
      )
    );
    setEditingTableId(null);
    setEditingName('');
  };

  const totalCount = tables.reduce((sum, table) => sum + table.data.length, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          {title}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          size="small"
          onClick={handleAddTable}
        >
          表を追加
        </Button>
      </Box>

      {tables.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography color="text.secondary">
            表がありません。「表を追加」ボタンまたはAI-OCR読込で追加してください。
          </Typography>
        </Box>
      ) : (
        tables.map((table, index) => (
          <Accordion key={table.id} defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mr: 2 }}>
                {editingTableId === table.id ? (
                  <TextField
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleSaveName(table.id)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveName(table.id);
                      }
                    }}
                    size="small"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    sx={{ mr: 1 }}
                  />
                ) : (
                  <>
                    <Typography sx={{ flexGrow: 1 }}>
                      {table.name} {table.data.length > 0 && `(${table.data.length}件)`}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditName(table.id, table.name);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(table.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderTable(
                table.data,
                (newData) => handleTableDataChange(table.id, newData)
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}