import React, { useState, useRef, useEffect } from 'react';
import { 
  Type, Trash2, RotateCw, HelpCircle, Download, Check, 
  Settings, Layers, Move, Grid, Plus, Eye, Minimize2, ZoomIn, ZoomOut, Hand, Magnet
} from 'lucide-react';

export interface SketchElement {
  id: string;
  type: 'wall' | 'measure' | 'block' | 'text';
  layer: 'paredes' | 'medidas' | 'blocos_civis' | 'ppci';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  rotation?: number;
  blockType?: 'door' | 'window' | 'extinguisher' | 'light' | 'exit_sign' | 'alarm' | 'hydrant';
  label?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  widthM?: number;
  heightM?: number;
  mirrored?: boolean;
}

export interface SketchLayers {
  paredes: string;
  medidas: string;
  blocos_civis: string;
  ppci: string;
  paredesThickness?: number;
  medidasThickness?: number;
  blocos_civisThickness?: number;
  ppciThickness?: number;
}

interface SketchCanvasProps {
  initialElements?: SketchElement[];
  initialLayers?: SketchLayers;
  onSave: (elements: SketchElement[], layers: SketchLayers) => void;
  onCancel: () => void;
  title?: string;
}

const defaultLayers: SketchLayers = {
  paredes: '#ffffff',     // White/Grey walls by default on dark canvas
  medidas: '#3b82f6',     // Blue measurements
  blocos_civis: '#10b981', // Emerald civil blocks
  ppci: '#ef4444'         // Red fire safety equipment
};

export function SketchCanvas({ 
  initialElements = [], 
  initialLayers = defaultLayers, 
  onSave, 
  onCancel,
  title = "Croqui da Loja" 
}: SketchCanvasProps) {
  const [elements, setElements] = useState<SketchElement[]>(initialElements);
  const [layers, setLayers] = useState<SketchLayers>({ ...defaultLayers, ...initialLayers });
  
  // Interaction state
  const [tool, setTool] = useState<'select' | 'wall' | 'measure' | 'block' | 'pan' | 'text'>('select');
  const [selectedBlockType, setSelectedBlockType] = useState<SketchElement['blockType']>('door');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [snapToEndpoints, setSnapToEndpoints] = useState<boolean>(true);
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(true);
  
  // Drawing temporary state
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [tempCoords, setTempCoords] = useState<{ x: number; y: number } | null>(null);
  
  // Dragging/moving state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(4);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasWidth = 1000;
  const canvasHeight = 700;
  const gridSpacing = 20;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const svgGroupRef = useRef<SVGGElement | null>(null);

  // Keyboard shortcut to delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent deleting if the user is typing in the label input
        if (document.activeElement?.tagName === 'INPUT') return;
        if (selectedElementId) {
          handleDeleteElement(selectedElementId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, elements]);

  // Translate screen client coordinates to SVG viewport coordinates
  const getSVGCoords = (e: React.PointerEvent<any> | React.MouseEvent<any> | React.TouchEvent<any>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      const touchEv = e as React.TouchEvent<any>;
      if (touchEv.touches && touchEv.touches.length > 0) {
        clientX = touchEv.touches[0].clientX;
        clientY = touchEv.touches[0].clientY;
      } else if (touchEv.changedTouches && touchEv.changedTouches.length > 0) {
        clientX = touchEv.changedTouches[0].clientX;
        clientY = touchEv.changedTouches[0].clientY;
      } else {
        return { x: 0, y: 0 };
      }
    } else {
      const mouseEv = e as React.MouseEvent<any>;
      clientX = mouseEv.clientX;
      clientY = mouseEv.clientY;
    }

    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    
    // Map client (screen) point into local space of the zoom-panned SVG group
    const targetElement = svgGroupRef.current || svg;
    const ctm = targetElement.getScreenCTM();
    if (ctm) {
      try {
        const transformedPoint = point.matrixTransform(ctm.inverse());
        return { x: Math.round(transformedPoint.x), y: Math.round(transformedPoint.y) };
      } catch (err) {
        // Fallback
      }
    }
    
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvasWidth;
    const y = ((clientY - rect.top) / rect.height) * canvasHeight;
    
    return { x: Math.round(x), y: Math.round(y) };
  };

  const getSnappedCoords = (rawCoords: { x: number; y: number }, holdShift = false) => {
    // If snap to endpoints is enabled, check if we are close to an existing wall's endpoint.
    // If so, snap directly to that endpoint.
    if (snapToEndpoints) {
      let closestPt: { x: number; y: number } | null = null;
      let minDistance = 25; // Snap distance threshold in local coordinates

      elements.forEach(el => {
        if (el.type === 'wall') {
          if (el.x1 !== undefined && el.y1 !== undefined) {
            const d1 = Math.sqrt(Math.pow(rawCoords.x - el.x1, 2) + Math.pow(rawCoords.y - el.y1, 2));
            if (d1 < minDistance) {
              minDistance = d1;
              closestPt = { x: el.x1, y: el.y1 };
            }
          }
          if (el.x2 !== undefined && el.y2 !== undefined) {
            const d2 = Math.sqrt(Math.pow(rawCoords.x - el.x2, 2) + Math.pow(rawCoords.y - el.y2, 2));
            if (d2 < minDistance) {
              minDistance = d2;
              closestPt = { x: el.x2, y: el.y2 };
            }
          }
        }
      });

      if (closestPt) {
        return closestPt;
      }
    }

    let x = rawCoords.x;
    let y = rawCoords.y;

    if (snapToGrid) {
      x = Math.round(x / gridSpacing) * gridSpacing;
      y = Math.round(y / gridSpacing) * gridSpacing;
    }

    if (holdShift && drawingStart) {
      const dx = Math.abs(x - drawingStart.x);
      const dy = Math.abs(y - drawingStart.y);
      if (dx > dy) {
        y = drawingStart.y;
      } else {
        x = drawingStart.x;
      }
    }

    return { x, y };
  };

  const isEndpoint = (pt: { x: number; y: number } | null) => {
    if (!pt) return false;
    return elements.some(el => 
      el.type === 'wall' && (
        (el.x1 === pt.x && el.y1 === pt.y) || 
        (el.x2 === pt.x && el.y2 === pt.y)
      )
    );
  };

  // Click on SVG background / elements
  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool === 'pan' || e.button === 1 || (tool === 'select' && e.shiftKey && !selectedElementId)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button !== 0 && e.pointerType === 'mouse') return; // Only left click for mouse drawing
    
    const coords = getSVGCoords(e);
    
    if (tool === 'wall' || tool === 'measure') {
      const snapped = getSnappedCoords(coords, e.shiftKey);
      setDrawingStart(snapped);
      setTempCoords(snapped);
    } else if (tool === 'block' && selectedBlockType) {
      const snapped = getSnappedCoords(coords);
      const layer: SketchElement['layer'] = ['door', 'window'].includes(selectedBlockType) ? 'blocos_civis' : 'ppci';
      
      const newBlock: SketchElement = {
        id: `elem-${Date.now()}`,
        type: 'block',
        layer,
        blockType: selectedBlockType,
        x: snapped.x,
        y: snapped.y,
        rotation: 0,
        label: getBlockLabel(selectedBlockType),
        width: selectedBlockType === 'window' ? 60 : 40,
        height: selectedBlockType === 'window' ? 12 : 40,
        widthM: selectedBlockType === 'door' ? 0.80 : selectedBlockType === 'window' ? 1.50 : undefined,
        heightM: selectedBlockType === 'door' ? 2.10 : selectedBlockType === 'window' ? 1.20 : undefined,
      };

      setElements(prev => [...prev, newBlock]);
      setSelectedElementId(newBlock.id);
      setTool('select'); // Switch back to selection
    } else if (tool === 'text') {
      const snapped = getSnappedCoords(coords);
      const newText: SketchElement = {
        id: `elem-${Date.now()}`,
        type: 'text',
        layer: 'medidas',
        x: snapped.x,
        y: snapped.y,
        rotation: 0,
        label: 'Texto',
        fontSize: 14
      };
      setElements(prev => [...prev, newText]);
      setSelectedElementId(newText.id);
      setTool('select'); // Switch back to selection
    } else if (tool === 'select') {
      // Clicking empty background deselects
      if (e.target === svgRef.current || (e.target as SVGElement).id === 'grid-background') {
        setSelectedElementId(null);
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getSVGCoords(e);
    
    if ((tool === 'wall' || tool === 'measure') && drawingStart) {
      const snapped = getSnappedCoords(coords, e.shiftKey);
      setTempCoords(snapped);
    } else if (tool === 'select' && isDragging && selectedElementId && dragStartPoint) {
      const snapped = getSnappedCoords(coords);
      const dx = snapped.x - dragStartPoint.x;
      const dy = snapped.y - dragStartPoint.y;

      setElements(prev => prev.map(el => {
        if (el.id !== selectedElementId) return el;
        
        if (el.type === 'block' || el.type === 'text') {
          return {
            ...el,
            x: (el.x || 0) + dx,
            y: (el.y || 0) + dy
          };
        } else {
          // Walls or measurements
          return {
            ...el,
            x1: (el.x1 || 0) + dx,
            y1: (el.y1 || 0) + dy,
            x2: (el.x2 || 0) + dx,
            y2: (el.y2 || 0) + dy,
          };
        }
      }));

      setDragStartPoint(snapped);
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (tool === 'wall' && drawingStart && tempCoords) {
      if (drawingStart.x !== tempCoords.x || drawingStart.y !== tempCoords.y) {
        const newWall: SketchElement = {
          id: `elem-${Date.now()}`,
          type: 'wall',
          layer: 'paredes',
          x1: drawingStart.x,
          y1: drawingStart.y,
          x2: tempCoords.x,
          y2: tempCoords.y
        };
        setElements(prev => [...prev, newWall]);
        setSelectedElementId(newWall.id);
      }
      setDrawingStart(null);
      setTempCoords(null);
    } else if (tool === 'measure' && drawingStart && tempCoords) {
      if (drawingStart.x !== tempCoords.x || drawingStart.y !== tempCoords.y) {
        // Calculate dynamic label based on coordinates (assuming 40px = 1 meter)
        const distancePx = Math.sqrt(Math.pow(tempCoords.x - drawingStart.x, 2) + Math.pow(tempCoords.y - drawingStart.y, 2));
        const meters = (distancePx / 40).toFixed(2) + 'm'; // 40px = 1m as scale
        
        const newMeasure: SketchElement = {
          id: `elem-${Date.now()}`,
          type: 'measure',
          layer: 'medidas',
          x1: drawingStart.x,
          y1: drawingStart.y,
          x2: tempCoords.x,
          y2: tempCoords.y,
          label: meters
        };
        setElements(prev => [...prev, newMeasure]);
        setSelectedElementId(newMeasure.id);
      }
      setDrawingStart(null);
      setTempCoords(null);
    } else if (tool === 'select' && isDragging) {
      setIsDragging(false);
      setDragOffset(null);
      setDragStartPoint(null);
    }
  };

  // Block dragging initiation
  const handleElementPointerDown = (e: React.PointerEvent<any>, element: SketchElement) => {
    if (tool !== 'select') return;
    e.stopPropagation(); // Avoid background click
    
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {}

    setSelectedElementId(element.id);
    setIsDragging(true);

    const coords = getSVGCoords(e);
    setDragStartPoint(getSnappedCoords(coords));
  };

  const handleDeleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleRotateElement = (id: string, angle = 45) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      return {
        ...el,
        rotation: ((el.rotation || 0) + angle) % 360
      };
    }));
  };

  const handleUpdateLabel = (id: string, label: string) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      return { ...el, label };
    }));
  };

  const handleUpdateFontSize = (id: string, fontSize: number) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      return { ...el, fontSize };
    }));
  };

  const handleUpdateDimensions = (id: string, widthM?: number, heightM?: number) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      return { 
        ...el, 
        widthM: widthM !== undefined ? widthM : el.widthM, 
        heightM: heightM !== undefined ? heightM : el.heightM 
      };
    }));
  };

  const handleToggleMirror = (id: string) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      return { ...el, mirrored: !el.mirrored };
    }));
  };

  const getBlockLabel = (type: SketchElement['blockType']) => {
    switch (type) {
      case 'door': return 'Porta';
      case 'window': return 'Janela';
      case 'extinguisher': return 'Extintor';
      case 'light': return 'Luz Em.';
      case 'exit_sign': return 'Sinaliz.';
      case 'alarm': return 'Botoeira';
      case 'hydrant': return 'Hidrante';
      default: return '';
    }
  };

  const handleClearCanvas = () => {
    if (confirm('Tem certeza de que deseja limpar todo o croqui?')) {
      setElements([]);
      setSelectedElementId(null);
    }
  };

  // Export to SVG file
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    
    // Create an editable clone of the SVG to format for download
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    svgClone.removeAttribute('class');
    svgClone.setAttribute('width', canvasWidth.toString());
    svgClone.setAttribute('height', canvasHeight.toString());
    
    // Remove selected element overlays or guides
    const activeIndicators = svgClone.querySelectorAll('.active-indicator');
    activeIndicators.forEach(el => el.remove());
    
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `croqui-loja-${new Date().getTime()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to DXF file
  const handleExportDXF = () => {
    let dxf = '';
    const dxfGroup = (code: number, value: any) => `${code}\n${value}\n`;

    // 1. Header
    dxf += dxfGroup(0, 'SECTION');
    dxf += dxfGroup(2, 'HEADER');
    dxf += dxfGroup(0, 'ENDSEC');

    // 2. Tables & Layers
    dxf += dxfGroup(0, 'SECTION');
    dxf += dxfGroup(2, 'TABLES');
    
    // Line Type Table
    dxf += dxfGroup(0, 'TABLE');
    dxf += dxfGroup(2, 'LTYPE');
    dxf += dxfGroup(70, 1);
    dxf += dxfGroup(0, 'LTYPE');
    dxf += dxfGroup(2, 'CONTINUOUS');
    dxf += dxfGroup(70, 0);
    dxf += dxfGroup(3, 'Solid line');
    dxf += dxfGroup(72, 65);
    dxf += dxfGroup(73, 0);
    dxf += dxfGroup(40, 0.0);
    dxf += dxfGroup(0, 'ENDTAB');

    // Layer Table
    dxf += dxfGroup(0, 'TABLE');
    dxf += dxfGroup(2, 'LAYER');
    dxf += dxfGroup(70, 4);
    
    // paredes (Green color index 3)
    dxf += dxfGroup(0, 'LAYER');
    dxf += dxfGroup(2, 'paredes');
    dxf += dxfGroup(70, 0);
    dxf += dxfGroup(62, 3);
    dxf += dxfGroup(6, 'CONTINUOUS');
    
    // medidas (Cyan color index 4)
    dxf += dxfGroup(0, 'LAYER');
    dxf += dxfGroup(2, 'medidas');
    dxf += dxfGroup(70, 0);
    dxf += dxfGroup(62, 4);
    dxf += dxfGroup(6, 'CONTINUOUS');

    // blocos_civis (Yellow color index 2)
    dxf += dxfGroup(0, 'LAYER');
    dxf += dxfGroup(2, 'blocos_civis');
    dxf += dxfGroup(70, 0);
    dxf += dxfGroup(62, 2);
    dxf += dxfGroup(6, 'CONTINUOUS');

    // ppci (Red color index 1)
    dxf += dxfGroup(0, 'LAYER');
    dxf += dxfGroup(2, 'ppci');
    dxf += dxfGroup(70, 0);
    dxf += dxfGroup(62, 1);
    dxf += dxfGroup(6, 'CONTINUOUS');

    dxf += dxfGroup(0, 'ENDTAB');
    dxf += dxfGroup(0, 'ENDSEC');

    // 3. Blocks section
    dxf += dxfGroup(0, 'SECTION');
    dxf += dxfGroup(2, 'BLOCKS');
    dxf += dxfGroup(0, 'ENDSEC');

    // 4. Entities section
    dxf += dxfGroup(0, 'SECTION');
    dxf += dxfGroup(2, 'ENTITIES');

    // Coordinate translation helper
    const transformPoint = (localX: number, localY: number, el: SketchElement) => {
      let lx = localX;
      let ly = localY;
      
      if (el.mirrored) {
        lx = -lx;
      }
      
      const angleRad = ((el.rotation || 0) * Math.PI) / 180;
      const rx = lx * Math.cos(angleRad) - ly * Math.sin(angleRad);
      const ry = lx * Math.sin(angleRad) + ly * Math.cos(angleRad);
      
      const gx = (el.x || 0) + rx;
      const gy = (el.y || 0) + ry;
      
      return {
        x: gx,
        y: -gy
      };
    };

    const addLine = (x1: number, y1: number, x2: number, y2: number, layerName: string) => {
      let str = '';
      str += dxfGroup(0, 'LINE');
      str += dxfGroup(8, layerName);
      str += dxfGroup(10, x1);
      str += dxfGroup(20, y1);
      str += dxfGroup(30, 0);
      str += dxfGroup(11, x2);
      str += dxfGroup(21, y2);
      str += dxfGroup(31, 0);
      return str;
    };

    const addCircle = (cx: number, cy: number, r: number, layerName: string) => {
      let str = '';
      str += dxfGroup(0, 'CIRCLE');
      str += dxfGroup(8, layerName);
      str += dxfGroup(10, cx);
      str += dxfGroup(20, cy);
      str += dxfGroup(30, 0);
      str += dxfGroup(40, r);
      return str;
    };

    const addText = (text: string, x: number, y: number, height: number, rot: number, layerName: string) => {
      let str = '';
      str += dxfGroup(0, 'TEXT');
      str += dxfGroup(8, layerName);
      str += dxfGroup(10, x);
      str += dxfGroup(20, y);
      str += dxfGroup(30, 0);
      str += dxfGroup(40, height);
      str += dxfGroup(1, text);
      if (rot !== 0) {
        const dxfRot = (360 - rot) % 360;
        str += dxfGroup(50, dxfRot);
      }
      return str;
    };

    elements.forEach(el => {
      if (el.type === 'wall') {
        const x1 = el.x1 || 0;
        const y1 = -(el.y1 || 0);
        const x2 = el.x2 || 0;
        const y2 = -(el.y2 || 0);
        dxf += addLine(x1, y1, x2, y2, 'paredes');
      } 
      
      else if (el.type === 'measure') {
        const x1 = el.x1 || 0;
        const y1 = -(el.y1 || 0);
        const x2 = el.x2 || 0;
        const y2 = -(el.y2 || 0);
        dxf += addLine(x1, y1, x2, y2, 'medidas');
        
        // Add short ticks at ends
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const ux = dx / len;
          const uy = dy / len;
          const px = -uy * 6;
          const py = ux * 6;
          dxf += addLine(x1 - px, y1 - py, x1 + px, y1 + py, 'medidas');
          dxf += addLine(x2 - px, y2 - py, x2 + px, y2 + py, 'medidas');
        }

        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        dxf += addText(el.label || '', mx, my + 8, el.fontSize || 12, 0, 'medidas');
      } 
      
      else if (el.type === 'text') {
        const x = el.x || 0;
        const y = -(el.y || 0);
        dxf += addText(el.label || '', x, y, el.fontSize || 12, el.rotation || 0, 'medidas');
      } 
      
      else if (el.type === 'block') {
        const layerName = ['door', 'window'].includes(el.blockType || '') ? 'blocos_civis' : 'ppci';
        
        if (el.blockType === 'door') {
          const pLeafStart = transformPoint(-20, 20, el);
          const pLeafEnd = transformPoint(-20, -20, el);
          dxf += addLine(pLeafStart.x, pLeafStart.y, pLeafEnd.x, pLeafEnd.y, layerName);

          const pFrameStart = transformPoint(-20, 20, el);
          const pFrameEnd = transformPoint(20, 20, el);
          dxf += addLine(pFrameStart.x, pFrameStart.y, pFrameEnd.x, pFrameEnd.y, layerName);

          let lastPt = transformPoint(-20, -20, el);
          for (let i = 1; i <= 16; i++) {
            const theta = -Math.PI/2 + (i / 16) * (Math.PI/2);
            const lx = -20 + 40 * Math.cos(theta);
            const ly = 20 + 40 * Math.sin(theta);
            const pt = transformPoint(lx, ly, el);
            dxf += addLine(lastPt.x, lastPt.y, pt.x, pt.y, layerName);
            lastPt = pt;
          }
        } 
        
        else if (el.blockType === 'window') {
          const pTL = transformPoint(-30, -6, el);
          const pTR = transformPoint(30, -6, el);
          const pBR = transformPoint(30, 6, el);
          const pBL = transformPoint(-30, 6, el);
          const pML = transformPoint(-30, 0, el);
          const pMR = transformPoint(30, 0, el);

          dxf += addLine(pTL.x, pTL.y, pTR.x, pTR.y, layerName);
          dxf += addLine(pTR.x, pTR.y, pBR.x, pBR.y, layerName);
          dxf += addLine(pBR.x, pBR.y, pBL.x, pBL.y, layerName);
          dxf += addLine(pBL.x, pBL.y, pTL.x, pTL.y, layerName);
          dxf += addLine(pML.x, pML.y, pMR.x, pMR.y, layerName);
        } 
        
        else if (el.blockType === 'extinguisher') {
          const pCenter = transformPoint(0, 0, el);
          dxf += addCircle(pCenter.x, pCenter.y, 14, layerName);
          
          const pTL = transformPoint(-4, -8, el);
          const pTR = transformPoint(4, -8, el);
          const pBR = transformPoint(4, 8, el);
          const pBL = transformPoint(-4, 8, el);
          dxf += addLine(pTL.x, pTL.y, pTR.x, pTR.y, layerName);
          dxf += addLine(pTR.x, pTR.y, pBR.x, pBR.y, layerName);
          dxf += addLine(pBR.x, pBR.y, pBL.x, pBL.y, layerName);
          dxf += addLine(pBL.x, pBL.y, pTL.x, pTL.y, layerName);

          const nTL = transformPoint(-6, -11, el);
          const nTR = transformPoint(6, -11, el);
          const nBR = transformPoint(6, -8, el);
          const nBL = transformPoint(-6, -8, el);
          dxf += addLine(nTL.x, nTL.y, nTR.x, nTR.y, layerName);
          dxf += addLine(nTR.x, nTR.y, nBR.x, nBR.y, layerName);
          dxf += addLine(nBR.x, nBR.y, nBL.x, nBL.y, layerName);
          dxf += addLine(nBL.x, nBL.y, nTL.x, nTL.y, layerName);

          dxf += addText('E', pCenter.x - 3, pCenter.y - 3, 7, el.rotation || 0, layerName);
        } 
        
        else if (el.blockType === 'light') {
          const pTL = transformPoint(-12, -8, el);
          const pTR = transformPoint(12, -8, el);
          const pBR = transformPoint(12, 8, el);
          const pBL = transformPoint(-12, 8, el);
          dxf += addLine(pTL.x, pTL.y, pTR.x, pTR.y, layerName);
          dxf += addLine(pTR.x, pTR.y, pBR.x, pBR.y, layerName);
          dxf += addLine(pBR.x, pBR.y, pBL.x, pBL.y, layerName);
          dxf += addLine(pBL.x, pBL.y, pTL.x, pTL.y, layerName);

          const pLampL = transformPoint(-6, -10, el);
          dxf += addCircle(pLampL.x, pLampL.y, 4, layerName);

          const pLampR = transformPoint(6, -10, el);
          dxf += addCircle(pLampR.x, pLampR.y, 4, layerName);

          const pCenter = transformPoint(0, 0, el);
          dxf += addText('IL', pCenter.x - 3, pCenter.y - 3, 6, el.rotation || 0, layerName);
        } 
        
        else if (el.blockType === 'exit_sign') {
          const pTL = transformPoint(-20, -10, el);
          const pTR = transformPoint(20, -10, el);
          const pBR = transformPoint(20, 10, el);
          const pBL = transformPoint(-20, 10, el);
          dxf += addLine(pTL.x, pTL.y, pTR.x, pTR.y, layerName);
          dxf += addLine(pTR.x, pTR.y, pBR.x, pBR.y, layerName);
          dxf += addLine(pBR.x, pBR.y, pBL.x, pBL.y, layerName);
          dxf += addLine(pBL.x, pBL.y, pTL.x, pTL.y, layerName);

          const pCenter = transformPoint(0, 0, el);
          dxf += addText('SAIDA', pCenter.x - 12, pCenter.y - 3, 6, el.rotation || 0, layerName);
        } 
        
        else if (el.blockType === 'alarm') {
          const pTL = transformPoint(-12, -12, el);
          const pTR = transformPoint(12, -12, el);
          const pBR = transformPoint(12, 12, el);
          const pBL = transformPoint(-12, 12, el);
          dxf += addLine(pTL.x, pTL.y, pTR.x, pTR.y, layerName);
          dxf += addLine(pTR.x, pTR.y, pBR.x, pBR.y, layerName);
          dxf += addLine(pBR.x, pBR.y, pBL.x, pBL.y, layerName);
          dxf += addLine(pBL.x, pBL.y, pTL.x, pTL.y, layerName);

          const pCenter = transformPoint(0, 0, el);
          dxf += addCircle(pCenter.x, pCenter.y, 6, layerName);
          dxf += addCircle(pCenter.x, pCenter.y, 3, layerName);
        } 
        
        else if (el.blockType === 'hydrant') {
          const pCenter = transformPoint(0, 0, el);
          dxf += addCircle(pCenter.x, pCenter.y, 14, layerName);
          dxf += addCircle(pCenter.x, pCenter.y, 8, layerName);

          dxf += addText('H', pCenter.x - 3, pCenter.y - 3, 8, el.rotation || 0, layerName);
        }

        if (el.label || ['door', 'window'].includes(el.blockType || '')) {
          const labelText = ['door', 'window'].includes(el.blockType || '') && el.widthM !== undefined && el.heightM !== undefined
            ? `${el.label || getBlockLabel(el.blockType)} ${el.widthM.toFixed(2)}x${el.heightM.toFixed(2)}`
            : (el.label || getBlockLabel(el.blockType));
          
          const pLabelCenter = transformPoint(0, 28, el);
          dxf += addText(labelText, pLabelCenter.x - 12, pLabelCenter.y, 7, el.rotation || 0, layerName);
        }
      }
    });

    dxf += dxfGroup(0, 'ENDSEC');
    dxf += dxfGroup(0, 'EOF');

    const blob = new Blob([dxf], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `croqui-loja-${new Date().getTime()}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get selected element details for panels
  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white font-sans overflow-hidden animate-in fade-in duration-200">
      
      {/* HEADER BAR */}
      <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-emerald-500" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">{title}</h1>
            <p className="text-xs text-zinc-400">Desenhe paredes, medidas, adicione extintores e sinalizações</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`p-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
              showLayerPanel ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Layers className="w-4 h-4" /> Layers & Cores
          </button>
          
          <button
            onClick={handleExportSVG}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
            title="Exportar para arquivo SVG"
          >
            <Download className="w-4 h-4" /> Exportar SVG
          </button>

          <button
            onClick={handleExportDXF}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
            title="Exportar para arquivo DXF (AutoCAD)"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Exportar DXF
          </button>
          
          <button
            onClick={() => onSave(elements, layers)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" /> Salvar Croqui
          </button>

          <button
            onClick={onCancel}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-2 rounded-lg text-sm border border-zinc-700"
          >
            <Minimize2 className="w-4 h-4" /> Fechar
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR: TOOLS & BLOCKS */}
        <div className="w-64 bg-zinc-900/90 border-r border-zinc-800 flex flex-col overflow-y-auto p-4 space-y-6">
          
          {/* TOOL SELECTOR */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">Ferramentas de Desenho</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setTool('select'); setSelectedElementId(null); }}
                className={`flex items-center p-2.5 rounded-lg border text-xs font-medium gap-2.5 transition-all w-full text-left ${
                  tool === 'select' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/10 font-semibold' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <Move className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Selecionar / Mover</span>
              </button>
              
              <button
                onClick={() => { setTool('wall'); setSelectedElementId(null); }}
                className={`flex items-center p-2.5 rounded-lg border text-xs font-medium gap-2.5 transition-all w-full text-left ${
                  tool === 'wall' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/10 font-semibold' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <div className="w-4 h-0.5 bg-current shrink-0 rounded my-1.5"></div>
                <span>Paredes (Linhas)</span>
              </button>

              <button
                onClick={() => { setTool('measure'); setSelectedElementId(null); }}
                className={`flex items-center p-2.5 rounded-lg border text-xs font-medium gap-2.5 transition-all w-full text-left ${
                  tool === 'measure' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/10 font-semibold' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <Type className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Medidas (Cotas)</span>
              </button>

              <button
                onClick={() => { setTool('text'); setSelectedElementId(null); }}
                className={`flex items-center p-2.5 rounded-lg border text-xs font-medium gap-2.5 transition-all w-full text-left ${
                  tool === 'text' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/10 font-semibold' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
                title="Clique na tela para adicionar textos personalizados"
              >
                <Type className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Texto Personalizado</span>
              </button>

              <button
                onClick={() => { setTool('pan'); setSelectedElementId(null); }}
                className={`flex items-center p-2.5 rounded-lg border text-xs font-medium gap-2.5 transition-all w-full text-left ${
                  tool === 'pan' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/10 font-semibold' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <Hand className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Mover Tela (Pan)</span>
              </button>

              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`flex items-center p-2.5 rounded-lg border text-xs font-medium gap-2.5 transition-all w-full text-left ${
                  snapToGrid 
                    ? 'bg-zinc-800 border-emerald-500/50 text-emerald-400 font-semibold' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                }`}
              >
                <Grid className="w-4 h-4 shrink-0" />
                <span>Snap Grade: {snapToGrid ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setSnapToEndpoints(!snapToEndpoints)}
                className={`flex items-center p-2.5 rounded-lg border text-xs font-medium gap-2.5 transition-all w-full text-left ${
                  snapToEndpoints 
                    ? 'bg-zinc-800 border-emerald-500/50 text-emerald-400 font-semibold' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                }`}
                title="Atrair automaticamente o cursor para o ponto final de paredes existentes"
              >
                <Magnet className="w-4 h-4 shrink-0" />
                <span>Atrair Pontas: {snapToEndpoints ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* INSERTABLE BLOCKS (DOORS, WINDOWS, PPCI EQUIPMENT) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">Elementos & Blocos</h3>
            
            {/* CIVIL STUFF */}
            <div className="space-y-2 mb-4">
              <span className="text-xs text-zinc-400 block font-medium">Elementos Civis</span>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setTool('block'); setSelectedBlockType('door'); }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-medium transition-all w-full ${
                    tool === 'block' && selectedBlockType === 'door'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="w-5 h-5 border-l-2 border-b-2 rounded-bl-full flex items-center justify-center text-[8px] shrink-0" style={{ borderColor: layers.blocos_civis }}></div>
                  <span>Porta</span>
                </button>
                <button
                  onClick={() => { setTool('block'); setSelectedBlockType('window'); }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-medium transition-all w-full ${
                    tool === 'block' && selectedBlockType === 'window'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="w-5 h-2 border-y flex items-center justify-center shrink-0" style={{ borderColor: layers.blocos_civis }}></div>
                  <span>Janela</span>
                </button>
              </div>
            </div>

            {/* PPCI EQUIPMENT */}
            <div className="space-y-2">
              <span className="text-xs text-zinc-400 block font-medium">Equipamentos de Combate e Alarme (PPCI)</span>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setTool('block'); setSelectedBlockType('extinguisher'); }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-medium transition-all w-full ${
                    tool === 'block' && selectedBlockType === 'extinguisher'
                      ? 'bg-red-500/20 border-red-500 text-red-400 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0" style={{ borderColor: layers.ppci, color: layers.ppci }}>E</div>
                  <span>Extintor</span>
                </button>

                <button
                  onClick={() => { setTool('block'); setSelectedBlockType('light'); }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-medium transition-all w-full ${
                    tool === 'block' && selectedBlockType === 'light'
                      ? 'bg-red-500/20 border-red-500 text-red-400 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="w-5 h-5 border flex items-center justify-center text-[9px] font-bold shrink-0" style={{ borderColor: layers.ppci, color: layers.ppci }}>IL</div>
                  <span>Iluminação de Emergência</span>
                </button>

                <button
                  onClick={() => { setTool('block'); setSelectedBlockType('exit_sign'); }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-medium transition-all w-full ${
                    tool === 'block' && selectedBlockType === 'exit_sign'
                      ? 'bg-red-500/20 border-red-500 text-red-400 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="w-5 h-3 border flex items-center justify-center text-[7px] font-semibold uppercase shrink-0" style={{ borderColor: layers.ppci, color: layers.ppci }}>S</div>
                  <span>Placa Saída</span>
                </button>

                <button
                  onClick={() => { setTool('block'); setSelectedBlockType('alarm'); }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-medium transition-all w-full ${
                    tool === 'block' && selectedBlockType === 'alarm'
                      ? 'bg-red-500/20 border-red-500 text-red-400 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="w-5 h-5 rounded-sm border-2 flex items-center justify-center text-[7px] font-bold shrink-0" style={{ borderColor: layers.ppci, color: layers.ppci }}>AL</div>
                  <span>Acionador</span>
                </button>

                <button
                  onClick={() => { setTool('block'); setSelectedBlockType('hydrant'); }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-medium transition-all w-full ${
                    tool === 'block' && selectedBlockType === 'hydrant'
                      ? 'bg-red-500/20 border-red-500 text-red-400 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="w-5 h-5 border flex items-center justify-center text-[10px] font-bold rounded-full shrink-0" style={{ borderColor: layers.ppci, color: layers.ppci }}>H</div>
                  <span>Hidrante</span>
                </button>
              </div>
            </div>
          </div>

          {/* EDIT PANEL FOR SELECTED ELEMENT */}
          {selectedElement && (
            <div className="border-t border-zinc-800 pt-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Editar Selecionado</h3>
              
              {/* Common deletion */}
              <button
                onClick={() => handleDeleteElement(selectedElement.id)}
                className="w-full flex items-center justify-center gap-2 bg-red-950 border border-red-800 text-red-400 hover:bg-red-900/50 p-2.5 rounded-lg text-xs font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Excluir Elemento
              </button>

              {/* Label editing (for measurements, or anything) */}
              {selectedElement.type !== 'wall' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Texto / Cota</label>
                  <input
                    type="text"
                    value={selectedElement.label || ''}
                    onChange={(e) => handleUpdateLabel(selectedElement.id, e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ex: 5.40m"
                  />
                </div>
              )}

              {/* Font size editing (for measurements and texts) */}
              {(selectedElement.type === 'measure' || selectedElement.type === 'text') && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-400">Tamanho da Fonte: {selectedElement.fontSize || 12}px</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="6"
                      max="32"
                      value={selectedElement.fontSize || 12}
                      onChange={(e) => handleUpdateFontSize(selectedElement.id, parseInt(e.target.value) || 12)}
                      className="flex-1 accent-emerald-500 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer border border-zinc-800"
                    />
                    <span className="text-xs font-mono text-zinc-400 w-8 text-right">{selectedElement.fontSize || 12}px</span>
                  </div>
                </div>
              )}

              {/* Door and Window Dimensions (largura x altura) */}
              {selectedElement.type === 'block' && ['door', 'window'].includes(selectedElement.blockType || '') && (
                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  <span className="text-[11px] font-semibold text-zinc-400 block">Dimensões (largura x altura)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-500">Largura (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="10"
                        value={selectedElement.widthM !== undefined ? selectedElement.widthM : 0.80}
                        onChange={(e) => handleUpdateDimensions(selectedElement.id, parseFloat(e.target.value) || 0.80, undefined)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-500">Altura (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="10"
                        value={selectedElement.heightM !== undefined ? selectedElement.heightM : 2.10}
                        onChange={(e) => handleUpdateDimensions(selectedElement.id, undefined, parseFloat(e.target.value) || 2.10)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Dimensões aparecem automaticamente em <strong className="text-zinc-300">L x A</strong> no desenho.
                  </p>
                </div>
              )}

              {/* Door Mirror option */}
              {selectedElement.type === 'block' && selectedElement.blockType === 'door' && (
                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  <span className="text-[11px] font-semibold text-zinc-400 block">Espelhamento</span>
                  <button
                    onClick={() => handleToggleMirror(selectedElement.id)}
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      selectedElement.mirrored
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                    }`}
                  >
                    {selectedElement.mirrored ? '✓ Espelhado (Invertido)' : 'Espelhar Porta'}
                  </button>
                </div>
              )}

              {/* Rotation editing (for blocks and texts) */}
              {(selectedElement.type === 'block' || selectedElement.type === 'text') && (
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-zinc-400 block">Rotação</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleRotateElement(selectedElement.id, 45)}
                      className="flex-1 flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded text-[11px] font-medium"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> +45°
                    </button>
                    <button
                      onClick={() => handleRotateElement(selectedElement.id, 90)}
                      className="flex-1 flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded text-[11px] font-medium"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> +90°
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LAYERS & CORES */}
          <div className="border-t border-zinc-800 pt-5 space-y-3">
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Cores & Layers
              </span>
              <span className="text-[10px] text-zinc-500 lowercase">
                {showLayerPanel ? 'Recolher' : 'Expandir'}
              </span>
            </button>

            {showLayerPanel && (
              <div className="space-y-5 pt-1 animate-in fade-in duration-150">
                {/* Paredes */}
                <div className="space-y-2 pb-2 border-b border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Paredes</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{layers.paredes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={layers.paredes} 
                      onChange={(e) => setLayers(prev => ({ ...prev, paredes: e.target.value }))}
                      className="bg-transparent border-0 cursor-pointer w-7 h-7 shrink-0"
                    />
                    <div className="flex-1 flex gap-1 flex-wrap">
                      {['#ffffff', '#a1a1aa', '#71717a', '#f59e0b', '#eab308'].map(c => (
                        <button 
                          key={c} onClick={() => setLayers(prev => ({ ...prev, paredes: c }))}
                          className="w-3.5 h-3.5 rounded-full border border-zinc-800 transition-transform active:scale-90" style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="shrink-0 w-14">Espessura:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="12" 
                      value={layers.paredesThickness || 4} 
                      onChange={(e) => setLayers(prev => ({ ...prev, paredesThickness: parseInt(e.target.value) }))}
                      className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="w-8 text-right font-mono text-zinc-400">{layers.paredesThickness || 4}px</span>
                  </div>
                </div>

                {/* Medidas / Cotas */}
                <div className="space-y-2 pb-2 border-b border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Medidas / Cotas</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{layers.medidas}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={layers.medidas} 
                      onChange={(e) => setLayers(prev => ({ ...prev, medidas: e.target.value }))}
                      className="bg-transparent border-0 cursor-pointer w-7 h-7 shrink-0"
                    />
                    <div className="flex-1 flex gap-1 flex-wrap">
                      {['#3b82f6', '#60a5fa', '#06b6d4', '#a855f7', '#ec4899'].map(c => (
                        <button 
                          key={c} onClick={() => setLayers(prev => ({ ...prev, medidas: c }))}
                          className="w-3.5 h-3.5 rounded-full border border-zinc-800 transition-transform active:scale-90" style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="shrink-0 w-14">Espessura:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      value={layers.medidasThickness || 2} 
                      onChange={(e) => setLayers(prev => ({ ...prev, medidasThickness: parseInt(e.target.value) }))}
                      className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="w-8 text-right font-mono text-zinc-400">{layers.medidasThickness || 2}px</span>
                  </div>
                </div>

                {/* Portas & Janelas */}
                <div className="space-y-2 pb-2 border-b border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Portas & Janelas</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{layers.blocos_civis}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={layers.blocos_civis} 
                      onChange={(e) => setLayers(prev => ({ ...prev, blocos_civis: e.target.value }))}
                      className="bg-transparent border-0 cursor-pointer w-7 h-7 shrink-0"
                    />
                    <div className="flex-1 flex gap-1 flex-wrap">
                      {['#10b981', '#34d399', '#22c55e', '#a3e635', '#00f5ff'].map(c => (
                        <button 
                          key={c} onClick={() => setLayers(prev => ({ ...prev, blocos_civis: c }))}
                          className="w-3.5 h-3.5 rounded-full border border-zinc-800 transition-transform active:scale-90" style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="shrink-0 w-14">Espessura:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      value={layers.blocos_civisThickness || 2} 
                      onChange={(e) => setLayers(prev => ({ ...prev, blocos_civisThickness: parseInt(e.target.value) }))}
                      className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="w-8 text-right font-mono text-zinc-400">{layers.blocos_civisThickness || 2}px</span>
                  </div>
                </div>

                {/* Equipamentos PPCI */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Equipamentos PPCI</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{layers.ppci}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={layers.ppci} 
                      onChange={(e) => setLayers(prev => ({ ...prev, ppci: e.target.value }))}
                      className="bg-transparent border-0 cursor-pointer w-7 h-7 shrink-0"
                    />
                    <div className="flex-1 flex gap-1 flex-wrap">
                      {['#ef4444', '#f87171', '#dc2626', '#f97316', '#ff003c'].map(c => (
                        <button 
                          key={c} onClick={() => setLayers(prev => ({ ...prev, ppci: c }))}
                          className="w-3.5 h-3.5 rounded-full border border-zinc-800 transition-transform active:scale-90" style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="shrink-0 w-14">Espessura:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      value={layers.ppciThickness || 2} 
                      onChange={(e) => setLayers(prev => ({ ...prev, ppciThickness: parseInt(e.target.value) }))}
                      className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="w-8 text-right font-mono text-zinc-400">{layers.ppciThickness || 2}px</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CLEAR OPTION */}
          <div className="pt-4 border-t border-zinc-800">
            <button
              onClick={handleClearCanvas}
              className="w-full text-zinc-500 hover:text-red-400 hover:bg-red-900/10 p-2 rounded text-xs transition-colors text-center border border-dashed border-zinc-800"
            >
              Limpar Tela de Desenho
            </button>
          </div>
        </div>

        {/* MAIN DRAWING AREA */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center p-6 overflow-auto">
          
          {/* INSTRUCTION FLOATING BADGE */}
          <div className="absolute top-4 left-84 bg-zinc-900/90 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-300 flex items-center gap-1.5 shadow-lg pointer-events-none z-10">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>
              {tool === 'select' && "Clique nos objetos para selecionar, mover ou girar."}
              {tool === 'wall' && "Arraste na tela para desenhar paredes. Segure Shift para travar reta."}
              {tool === 'measure' && "Arraste de um ponto a outro para inserir uma cota de medida."}
              {tool === 'text' && "Clique em qualquer lugar do desenho para inserir um texto personalizado."}
              {tool === 'block' && "Clique em qualquer ponto da grade para carimbar o bloco selecionado."}
              {tool === 'pan' && "Arraste em qualquer lugar do desenho para mover a folha."}
            </span>
          </div>

          {/* FLOATING ZOOM & PAN CONTROLS */}
          <div className="absolute top-4 right-4 bg-zinc-900/95 border border-zinc-800 rounded-xl p-2 flex items-center gap-2 shadow-2xl z-10 backdrop-blur-sm">
            <button
              onClick={() => setZoom(z => Math.max(z - 0.15, 0.4))}
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
              title="Afastar (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-zinc-300 px-1 min-w-[48px] text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.15, 8.0))}
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
              title="Aproximar (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
            <button
              onClick={() => {
                setZoom(4);
                setPan({ x: 0, y: 0 });
              }}
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors text-xs font-semibold"
              title="Resetar Zoom e Centralizar"
            >
              400%
            </button>
          </div>

          {/* SVG CANVAS CONTAINER */}
          <div className="bg-[#0c0c0e] rounded-xl shadow-2xl border border-zinc-800 overflow-hidden relative" style={{ width: canvasWidth, height: canvasHeight }}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onWheel={(e) => {
                // Smooth wheel zooming
                const zoomFactor = 1.08;
                setZoom(z => e.deltaY < 0 ? Math.min(z * zoomFactor, 8.0) : Math.max(z / zoomFactor, 0.4));
              }}
              className="select-none touch-none"
              style={{ cursor: tool === 'select' ? 'default' : tool === 'pan' ? 'grab' : 'crosshair' }}
            >
              {/* SVG DEFINITIONS & MARKERS FOR DIMENSION LINES */}
              <defs>
                <pattern id="grid" width={gridSpacing} height={gridSpacing} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridSpacing} 0 L 0 0 0 ${gridSpacing}`} fill="none" stroke="#27272a" strokeWidth="0.5" />
                </pattern>
                <pattern id="grid-major" width={gridSpacing * 5} height={gridSpacing * 5} patternUnits="userSpaceOnUse">
                  <rect width={gridSpacing * 5} height={gridSpacing * 5} fill="none" />
                  <path d={`M ${gridSpacing * 5} 0 L 0 0 0 ${gridSpacing * 5}`} fill="none" stroke="#3f3f46" strokeWidth="1" />
                </pattern>
                
                {/* Arrowheads for dimension cotas */}
                <marker id="arrow-start" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={layers.medidas} />
                </marker>
                <marker id="arrow-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={layers.medidas} />
                </marker>
              </defs>

              {/* ZOOMED & PANNED WORKSPACE GROUP */}
              <g ref={svgGroupRef} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* GRID BACKGROUNDS */}
                <rect id="grid-background" width={canvasWidth} height={canvasHeight} fill="url(#grid)" />
                <rect width={canvasWidth} height={canvasHeight} fill="url(#grid-major)" opacity="0.5" pointerEvents="none" />

                {/* SVG RENDERED ELEMENTS */}
                {elements.map(el => {
                  const isActive = el.id === selectedElementId;
                  
                  if (el.type === 'wall') {
                    return (
                      <g key={el.id} className="group" onPointerDown={(e) => handleElementPointerDown(e, el)}>
                        {/* Thicker transparent interactive handle line */}
                        <line 
                          x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} 
                          stroke="transparent" strokeWidth="15" 
                          className="cursor-pointer"
                        />
                        {/* Visual wall line */}
                        <line 
                          x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} 
                          stroke={layers.paredes} strokeWidth={isActive ? (layers.paredesThickness || 4) + 2 : (layers.paredesThickness || 4)} 
                          strokeLinecap="round"
                          className="transition-all"
                        />
                        {/* Endpoint joint dots */}
                        <circle cx={el.x1} cy={el.y1} r="3" fill="#ffffff" />
                        <circle cx={el.x2} cy={el.y2} r="3" fill="#ffffff" />
                        
                        {/* Highlight border on selection */}
                        {isActive && (
                          <line 
                            x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} 
                            stroke="rgba(16, 185, 129, 0.3)" strokeWidth="12" 
                            strokeLinecap="round" pointerEvents="none"
                            className="active-indicator"
                          />
                        )}
                      </g>
                    );
                  }

                  if (el.type === 'measure') {
                    const dx = (el.x2 || 0) - (el.x1 || 0);
                    const dy = (el.y2 || 0) - (el.y1 || 0);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    const midX = ((el.x1 || 0) + (el.x2 || 0)) / 2;
                    const midY = ((el.y1 || 0) + (el.y2 || 0)) / 2;
                    const len = Math.sqrt(dx * dx + dy * dy);

                    // Fixed-size perpendicular ticks (length of 6px each side, total 12px)
                    let px = 0;
                    let py = 0;
                    if (len > 0) {
                      px = -dy / len * 6;
                      py = dx / len * 6;
                    }

                    return (
                      <g key={el.id} className="group" onPointerDown={(e) => handleElementPointerDown(e, el)}>
                        {/* Transparent handle */}
                        <line 
                          x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} 
                          stroke="transparent" strokeWidth="15" 
                          className="cursor-pointer"
                        />
                        {/* Measure line with arrows */}
                        <line 
                          x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} 
                          stroke={layers.medidas} strokeWidth={layers.medidasThickness || 2} 
                          markerStart="url(#arrow-start)"
                          markerEnd="url(#arrow-end)"
                        />
                        {/* Perfect fixed-size end ticks */}
                        {len > 0 && (
                          <>
                            <line 
                              x1={(el.x1 || 0) - px} y1={(el.y1 || 0) - py} 
                              x2={(el.x1 || 0) + px} y2={(el.y1 || 0) + py} 
                              stroke={layers.medidas} strokeWidth={layers.medidasThickness || 2} 
                            />
                            <line 
                              x1={(el.x2 || 0) - px} y1={(el.y2 || 0) - py} 
                              x2={(el.x2 || 0) + px} y2={(el.y2 || 0) + py} 
                              stroke={layers.medidas} strokeWidth={layers.medidasThickness || 2} 
                            />
                          </>
                        )}
                        
                        {/* Text box label inside square */}
                        <g transform={`translate(${midX}, ${midY}) rotate(${angle > 90 || angle < -90 ? angle + 180 : angle})`}>
                          <rect 
                            x={-((el.label || '0.00m').length * (el.fontSize || 9) * 0.35 + 6)}
                            y={-((el.fontSize || 9) * 0.6 + 4)}
                            width={(el.label || '0.00m').length * (el.fontSize || 9) * 0.7 + 12}
                            height={(el.fontSize || 9) * 1.2 + 8}
                            fill="#0c0c0e" 
                            rx="1" 
                            stroke={isActive ? "#10b981" : layers.medidas} 
                            strokeWidth={isActive ? 2 : (layers.medidasThickness || 2)}
                          />
                          <text 
                            y={(el.fontSize || 9) * 0.33} textAnchor="middle" 
                            fill={layers.medidas} fontSize={el.fontSize || 9} fontWeight="bold" fontFamily="monospace"
                          >
                            {el.label || '0.00m'}
                          </text>
                        </g>
                        
                        {isActive && (
                          <line 
                            x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} 
                            stroke="rgba(16, 185, 129, 0.2)" strokeWidth="8" 
                            pointerEvents="none" className="active-indicator"
                          />
                        )}
                      </g>
                    );
                  }

                  if (el.type === 'block') {
                    const rot = el.rotation || 0;
                    const x = el.x || 0;
                    const y = el.y || 0;

                    return (
                      <g 
                        key={el.id} 
                        transform={`translate(${x}, ${y}) rotate(${rot})`} 
                        className="group cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handleElementPointerDown(e, el)}
                      >
                        {/* Highlight block background */}
                        {isActive && (
                          <rect 
                            x="-25" y="-25" width="50" height="50" 
                            fill="transparent" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3"
                            className="active-indicator"
                          />
                        )}

                        {/* DOOR DRAWING */}
                        {el.blockType === 'door' && (
                          <g transform={el.mirrored ? "scale(-1, 1)" : undefined}>
                            {/* Swing arc (dashed) */}
                            <path 
                              d="M 20,20 A 40,40 0 0,0 -20,-20" 
                              fill="none" 
                              stroke={layers.blocos_civis} 
                              strokeWidth={layers.blocos_civisThickness || 2} 
                              strokeDasharray="3,3" 
                            />
                            {/* Door Leaf */}
                            <line 
                              x1="-20" y1="20" x2="-20" y2="-20" 
                              stroke={layers.blocos_civis} 
                              strokeWidth={(layers.blocos_civisThickness || 2) * 1.5} 
                              strokeLinecap="round" 
                            />
                            {/* Left Jamb */}
                            <rect 
                              x="-23" y="17" width="3" height="6" 
                              fill="none" 
                              stroke={layers.blocos_civis} 
                              strokeWidth={layers.blocos_civisThickness || 2} 
                            />
                            {/* Right Jamb */}
                            <rect 
                              x="20" y="17" width="3" height="6" 
                              fill="none" 
                              stroke={layers.blocos_civis} 
                              strokeWidth={layers.blocos_civisThickness || 2} 
                            />
                            {/* Threshold reference line */}
                            <line 
                              x1="-20" y1="20" x2="20" y2="20" 
                              stroke={layers.blocos_civis} 
                              strokeWidth={(layers.blocos_civisThickness || 2) * 0.5} 
                              strokeDasharray="1,2" 
                              opacity="0.6" 
                            />
                          </g>
                        )}

                        {/* WINDOW DRAWING */}
                        {el.blockType === 'window' && (
                          <g>
                            <rect x="-30" y="-6" width="60" height="12" fill="#000" stroke={layers.blocos_civis} strokeWidth={layers.blocos_civisThickness || 2} />
                            <line x1="-30" y1="0" x2="30" y2="0" stroke={layers.blocos_civis} strokeWidth={(layers.blocos_civisThickness || 2) * 0.5} />
                          </g>
                        )}

                        {/* EXTINGUISHER */}
                        {el.blockType === 'extinguisher' && (
                          <g>
                            {/* Circle and symbol */}
                            <circle cx="0" cy="0" r="14" fill="#000" stroke={layers.ppci} strokeWidth={layers.ppciThickness || 2} />
                            <rect x="-4" y="-8" width="8" height="16" rx="2" fill={layers.ppci} />
                            <rect x="-6" y="-11" width="12" height="3" rx="1" fill={layers.ppci} />
                            <line x1="-3" y1="-5" x2="3" y2="-5" stroke="#fff" strokeWidth="1" />
                            <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">E</text>
                          </g>
                        )}

                        {/* EMERGENCY LIGHT */}
                        {el.blockType === 'light' && (
                          <g>
                            <rect x="-12" y="-8" width="24" height="16" rx="2" fill="#000" stroke={layers.ppci} strokeWidth={layers.ppciThickness || 2} />
                            {/* Dual Spotlight visual lamps */}
                            <circle cx="-6" cy="-10" r="4" fill="#000" stroke={layers.ppci} strokeWidth={(layers.ppciThickness || 2) * 0.75} />
                            <circle cx="6" cy="-10" r="4" fill="#000" stroke={layers.ppci} strokeWidth={(layers.ppciThickness || 2) * 0.75} />
                            <text x="0" y="3" textAnchor="middle" fill={layers.ppci} fontSize="7" fontWeight="black">IL</text>
                          </g>
                        )}

                        {/* EXIT SIGN */}
                        {el.blockType === 'exit_sign' && (
                          <g>
                            <rect x="-20" y="-10" width="40" height="20" rx="1" fill="#14532d" stroke={layers.ppci} strokeWidth={layers.ppciThickness || 1.5} />
                            <text x="0" y="3" textAnchor="middle" fill="#22c55e" fontSize="7" fontWeight="extrabold">SAÍDA</text>
                            <path d="M 12,-4 L 16,0 L 12,4" fill="none" stroke="#22c55e" strokeWidth={(layers.ppciThickness || 1.5) * 1} strokeLinecap="round" />
                          </g>
                        )}

                        {/* FIRE ALARM BUTTON */}
                        {el.blockType === 'alarm' && (
                          <g>
                            <rect x="-12" y="-12" width="24" height="24" rx="1" fill="#000" stroke={layers.ppci} strokeWidth={(layers.ppciThickness || 2.5) * 1.25} />
                            <circle cx="0" cy="0" r="6" fill="transparent" stroke={layers.ppci} strokeWidth={layers.ppciThickness || 2} />
                            <circle cx="0" cy="0" r="3" fill={layers.ppci} />
                          </g>
                        )}

                        {/* HYDRANT */}
                        {el.blockType === 'hydrant' && (
                          <g>
                            <circle cx="0" cy="0" r="14" fill="#000" stroke={layers.ppci} strokeWidth={layers.ppciThickness || 2} />
                            <circle cx="0" cy="0" r="8" fill="transparent" stroke={layers.ppci} strokeWidth={(layers.ppciThickness || 1.5) * 0.75} strokeDasharray="3,3" />
                            <text x="0" y="3.5" textAnchor="middle" fill={layers.ppci} fontSize="11" fontWeight="black">H</text>
                          </g>
                        )}

                        {/* Display small label below block */}
                        <text 
                          y="28" textAnchor="middle" 
                          fill="#a1a1aa" fontSize="8.5" fontWeight="semibold"
                          className="opacity-90 pointer-events-none"
                        >
                          {['door', 'window'].includes(el.blockType || '') && el.widthM !== undefined && el.heightM !== undefined
                            ? `${el.label || getBlockLabel(el.blockType)} ${el.widthM.toFixed(2)}x${el.heightM.toFixed(2)}`
                            : el.label}
                        </text>
                      </g>
                    );
                  }

                  if (el.type === 'text') {
                    const rot = el.rotation || 0;
                    const x = el.x || 0;
                    const y = el.y || 0;
                    const fontSize = el.fontSize || 12;

                    return (
                      <g 
                        key={el.id} 
                        transform={`translate(${x}, ${y}) rotate(${rot})`} 
                        className="group cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handleElementPointerDown(e, el)}
                      >
                        {/* Highlight text box on selection */}
                        {isActive && (
                          <rect 
                            x="-50" y="-18" width="100" height="36" 
                            fill="transparent" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3"
                            className="active-indicator"
                          />
                        )}

                        {/* Text element */}
                        <text 
                          textAnchor="middle" 
                          dominantBaseline="middle"
                          fill="#ffffff" 
                          fontSize={fontSize} 
                          fontWeight="bold"
                          className="pointer-events-none select-none"
                        >
                          {el.label || 'Texto'}
                        </text>
                      </g>
                    );
                  }

                  return null;
                })}

                {/* RENDER TEMPORARY DRAWING INDICATORS */}
                {drawingStart && tempCoords && (
                  <g pointerEvents="none">
                    {tool === 'wall' && (
                      <line 
                        x1={drawingStart.x} y1={drawingStart.y} 
                        x2={tempCoords.x} y2={tempCoords.y} 
                        stroke={layers.paredes} strokeWidth="3" opacity="0.6" strokeDasharray="5,5" 
                      />
                    )}
                    {tool === 'measure' && (() => {
                      const dx = tempCoords.x - drawingStart.x;
                      const dy = tempCoords.y - drawingStart.y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      const midX = (drawingStart.x + tempCoords.x) / 2;
                      const midY = (drawingStart.y + tempCoords.y) / 2;
                      const label = (len / 40).toFixed(2) + 'm';
                      
                      let px = 0;
                      let py = 0;
                      if (len > 0) {
                        px = -dy / len * 6;
                        py = dx / len * 6;
                      }

                      return (
                        <g opacity="0.8">
                          {/* Measure line with arrows */}
                          <line 
                            x1={drawingStart.x} y1={drawingStart.y} 
                            x2={tempCoords.x} y2={tempCoords.y} 
                            stroke={layers.medidas} strokeWidth={layers.medidasThickness || 2} 
                            markerStart="url(#arrow-start)"
                            markerEnd="url(#arrow-end)"
                          />
                          {/* End ticks */}
                          {len > 0 && (
                            <>
                              <line 
                                x1={drawingStart.x - px} y1={drawingStart.y - py} 
                                x2={drawingStart.x + px} y2={drawingStart.y + py} 
                                stroke={layers.medidas} strokeWidth={layers.medidasThickness || 2} 
                              />
                              <line 
                                x1={tempCoords.x - px} y1={tempCoords.y - py} 
                                x2={tempCoords.x + px} y2={tempCoords.y + py} 
                                stroke={layers.medidas} strokeWidth={layers.medidasThickness || 2} 
                              />
                            </>
                          )}
                          {/* Text box label inside square */}
                          <g transform={`translate(${midX}, ${midY}) rotate(${angle > 90 || angle < -90 ? angle + 180 : angle})`}>
                            <rect 
                              x={-(label.length * 10 * 0.35 + 6)}
                              y={-(10 * 0.6 + 4)}
                              width={label.length * 10 * 0.7 + 12}
                              height={10 * 1.2 + 8}
                              fill="#0c0c0e" 
                              rx="1" 
                              stroke={layers.medidas} 
                              strokeWidth={layers.medidasThickness || 2}
                            />
                            <text 
                              y={10 * 0.33} textAnchor="middle" 
                              fill={layers.medidas} fontSize="10" fontWeight="bold" fontFamily="monospace"
                            >
                              {label}
                            </text>
                          </g>
                        </g>
                      );
                    })()}

                    {/* SNAP TO ENDPOINT VISUAL HIGHLIGHTS */}
                    {snapToEndpoints && isEndpoint(drawingStart) && (
                      <circle 
                        cx={drawingStart.x} 
                        cy={drawingStart.y} 
                        r="6" 
                        fill="#10b981" 
                        stroke="#059669" 
                        strokeWidth="1.5" 
                        opacity="0.8"
                      />
                    )}
                    {snapToEndpoints && isEndpoint(tempCoords) && (
                      <g>
                        <circle 
                          cx={tempCoords.x} 
                          cy={tempCoords.y} 
                          r="8" 
                          fill="transparent" 
                          stroke="#10b981" 
                          strokeWidth="2" 
                          opacity="0.9"
                        />
                        <circle 
                          cx={tempCoords.x} 
                          cy={tempCoords.y} 
                          r="3" 
                          fill="#10b981" 
                        />
                      </g>
                    )}
                  </g>
                )}
              </g>
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}
