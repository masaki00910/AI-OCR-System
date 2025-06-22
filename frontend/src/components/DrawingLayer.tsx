import React, { useState, useRef } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import Konva from 'konva';

interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tableType?: 'parcel_areas' | 'parcel_points' | 'area_details' | 'parcels';
}

interface DrawingLayerProps {
  width: number;
  height: number;
  mode: 'select' | 'move';
  onSelectionComplete: (rect: Rectangle) => void;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  width,
  height,
  mode,
  onSelectionComplete,
}) => {
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (mode !== 'select') return;

    const stage = e.target.getStage();
    if (!stage) return;

    const point = stage.getPointerPosition();
    if (!point) return;

    // 新しい矩形を描画する前に既存の矩形をクリア
    setRectangles([]);

    const newRect: Rectangle = {
      id: `rect-${Date.now()}`,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };

    setCurrentRect(newRect);
    setIsDrawing(true);
    setSelectedId(null);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !currentRect) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const point = stage.getPointerPosition();
    if (!point) return;

    const updatedRect = {
      ...currentRect,
      width: point.x - currentRect.x,
      height: point.y - currentRect.y,
    };

    setCurrentRect(updatedRect);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;

    if (Math.abs(currentRect.width) > 10 && Math.abs(currentRect.height) > 10) {
      // Normalize rectangle (handle negative width/height)
      const normalizedRect: Rectangle = {
        ...currentRect,
        x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
        y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
        width: Math.abs(currentRect.width),
        height: Math.abs(currentRect.height),
      };

      setRectangles([normalizedRect]); // 1つの矩形のみ保持
      onSelectionComplete(normalizedRect);
    }

    setCurrentRect(null);
    setIsDrawing(false);
  };

  const handleRectClick = (id: string) => {
    if (mode === 'move') {
      setSelectedId(id);
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
    const updatedRects = rectangles.map(rect => 
      rect.id === id 
        ? { ...rect, x: node.x(), y: node.y() }
        : rect
    );
    setRectangles(updatedRects);
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const updatedRects = rectangles.map(rect =>
      rect.id === id
        ? {
            ...rect,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          }
        : rect
    );
    setRectangles(updatedRects);
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        zIndex: 10,
        pointerEvents: mode === 'select' ? 'auto' : 'none'
      }}
    >
      <Layer ref={layerRef}>
        {rectangles.map((rect) => (
          <React.Fragment key={rect.id}>
            <Rect
              id={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3B82F6"
              strokeWidth={2}
              draggable={mode === 'move'}
              onClick={() => handleRectClick(rect.id)}
              onTap={() => handleRectClick(rect.id)}
              onDragEnd={(e) => handleDragEnd(e, rect.id)}
              onTransformEnd={(e) => handleTransformEnd(e, rect.id)}
            />
            {selectedId === rect.id && mode === 'move' && (
              <Transformer
                nodes={[stageRef.current?.findOne(`#${rect.id}`) as any]}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}
          </React.Fragment>
        ))}
        {isDrawing && currentRect && (
          <Rect
            x={currentRect.x}
            y={currentRect.y}
            width={currentRect.width}
            height={currentRect.height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[5, 5]}
          />
        )}
      </Layer>
    </Stage>
  );
};