import { useEffect, useRef, useState, useCallback } from "react";
import { GcodeCommand } from "@shared/schema";
import { GcodeRenderer } from "@/lib/gcode-renderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  MousePointer, 
  Square,
  Circle,
  Pentagon
} from "lucide-react";

interface VisualizationPanelProps {
  commands: GcodeCommand[];
  selectedLines: Set<number>;
  onSelectionChange: (selectedIndices: number[]) => void;
  zHeights: number[];
  visibleZHeights: Set<number>;
  units?: 'metric' | 'imperial';
}

export function VisualizationPanel({ 
  commands, 
  selectedLines, 
  onSelectionChange, 
  zHeights,
  visibleZHeights,
  units = 'metric'
}: VisualizationPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GcodeRenderer | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [selectionTool, setSelectionTool] = useState<'pointer' | 'rectangle' | 'circle' | 'polygon'>('rectangle');

  const formatCoordinate = (value: number): string => {
    // Convert from internal mm to display units
    const converted = units === 'imperial' ? value / 25.4 : value;
    return converted.toFixed(units === 'metric' ? 1 : 3);
  };

  const getUnitsLabel = (): string => {
    return units === 'metric' ? 'mm' : 'in';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }

      if (rendererRef.current) {
        // Use logical dimensions (not scaled by devicePixelRatio) for coordinate calculations
        rendererRef.current.updateSettings({
          width: rect.width,
          height: rect.height,
        });
        renderVisualization();
      }
    };

    try {
      rendererRef.current = new GcodeRenderer(canvas);
      resizeCanvas();
      
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
    }
  }, []);

  const renderVisualization = useCallback(() => {
    if (!rendererRef.current) return;

    // Filter commands by visible Z heights
    const visibleCommands = commands.filter(cmd => {
      if (cmd.z === undefined) return true;
      return visibleZHeights.has(cmd.z);
    });

    // Update renderer settings
    rendererRef.current.updateSettings({
      selectedCommands: new Set(Array.from(selectedLines)),
    });

    // Set Z-height colors
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
    zHeights.forEach((z, index) => {
      rendererRef.current?.setZHeightColor(z, colors[index % colors.length]);
    });

    rendererRef.current.render(visibleCommands);

    // Render selection rectangle if active
    if (isSelecting && selectionStart && selectionEnd && rendererRef.current) {
      const worldStart = rendererRef.current.screenToWorld(selectionStart.x, selectionStart.y);
      const worldEnd = rendererRef.current.screenToWorld(selectionEnd.x, selectionEnd.y);
      rendererRef.current.renderSelectionRectangle(
        worldStart.x, worldStart.y, worldEnd.x, worldEnd.y
      );
    }
  }, [commands, selectedLines, zHeights, visibleZHeights, isSelecting, selectionStart, selectionEnd]);

  useEffect(() => {
    renderVisualization();
  }, [renderVisualization]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const rect = canvas.getBoundingClientRect();
    // Account for canvas coordinate system (logical pixels, not device pixels)
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    const worldPos = renderer.screenToWorld(screenX, screenY);
    setMousePos(worldPos);

    if (isSelecting && selectionStart) {
      setSelectionEnd({ x: screenX, y: screenY });
      renderVisualization();
    }
  }, [isSelecting, selectionStart, renderVisualization]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectionTool !== 'rectangle') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Use logical pixels for consistent coordinate system
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    console.log('Mouse down:', { clientX: e.clientX, clientY: e.clientY, rectLeft: rect.left, rectTop: rect.top, screenX, screenY });

    setIsSelecting(true);
    setSelectionStart({ x: screenX, y: screenY });
    setSelectionEnd({ x: screenX, y: screenY });
  }, [selectionTool]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd || !rendererRef.current) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const worldStart = rendererRef.current.screenToWorld(selectionStart.x, selectionStart.y);
    const worldEnd = rendererRef.current.screenToWorld(selectionEnd.x, selectionEnd.y);

    // Find commands in selection region
    const minX = Math.min(worldStart.x, worldEnd.x);
    const maxX = Math.max(worldStart.x, worldEnd.x);
    const minY = Math.min(worldStart.y, worldEnd.y);
    const maxY = Math.max(worldStart.y, worldEnd.y);

    const selectedIndices: number[] = [];
    commands.forEach((cmd, index) => {
      if (cmd.x !== undefined && cmd.y !== undefined) {
        if (cmd.x >= minX && cmd.x <= maxX && cmd.y >= minY && cmd.y <= maxY) {
          selectedIndices.push(index);
        }
      }
    });

    onSelectionChange(selectedIndices);

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    renderVisualization();
  }, [isSelecting, selectionStart, selectionEnd, commands, onSelectionChange, renderVisualization]);

  const handleFitToView = () => {
    // This would implement zoom-to-fit functionality
    renderVisualization();
  };

  const handleZoom = (direction: 'in' | 'out') => {
    // This would implement zoom functionality
    console.log(`Zoom ${direction}`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-medium text-gray-900">2D Toolpath Visualization</h2>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleZoom('in')}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleZoom('out')}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFitToView}
            title="Fit to View"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <Button
            size="sm"
            variant={selectionTool === 'pointer' ? 'default' : 'ghost'}
            onClick={() => setSelectionTool('pointer')}
            title="Select Tool"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={selectionTool === 'rectangle' ? 'default' : 'ghost'}
            onClick={() => setSelectionTool('rectangle')}
            title="Rectangle Select"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={selectionTool === 'circle' ? 'default' : 'ghost'}
            onClick={() => setSelectionTool('circle')}
            title="Circle Select"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={selectionTool === 'polygon' ? 'default' : 'ghost'}
            onClick={() => setSelectionTool('polygon')}
            title="Polygon Select"
          >
            <Pentagon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-white m-4 rounded-lg shadow-sm border border-gray-200">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{ cursor: selectionTool === 'rectangle' && isSelecting ? 'crosshair' : 'default' }}
        />

        {/* Coordinate Display */}
        <Card className="absolute top-4 left-4 p-3">
          <div className="text-sm font-mono space-y-1">
            <div>
              X: <span className="text-primary font-medium">{formatCoordinate(mousePos.x)}</span> {getUnitsLabel()}
            </div>
            <div>
              Y: <span className="text-primary font-medium">{formatCoordinate(mousePos.y)}</span> {getUnitsLabel()}
            </div>
          </div>
        </Card>

        {/* Empty State */}
        {commands.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium mb-2">No G-Code Loaded</div>
              <div className="text-sm">Load a G-Code file to see the visualization</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
