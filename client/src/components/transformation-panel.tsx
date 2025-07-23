import { useState } from "react";
import { Transformation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Move,
  RotateCw,
  Scale,
  ChevronUp,
  ChevronDown,
  Ruler
} from "lucide-react";

interface TransformationPanelProps {
  zHeights: number[];
  visibleZHeights: Set<number>;
  onZHeightVisibilityChange: (zHeight: number, visible: boolean) => void;
  selectedCommandsCount: number;
  selectionBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  } | null;
  onApplyTransformation: (transformation: Transformation) => void;
  fileName?: string;
  fileSize?: number;
  totalLines?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  units?: 'metric' | 'imperial';
  onUnitsChange?: (units: 'metric' | 'imperial') => void;
}

export function TransformationPanel({
  zHeights,
  visibleZHeights,
  onZHeightVisibilityChange,
  selectedCommandsCount,
  selectionBounds,
  onApplyTransformation,
  fileName,
  fileSize,
  totalLines,
  isCollapsed = false,
  onToggleCollapse,
  units = 'metric',
  onUnitsChange,
}: TransformationPanelProps) {
  const [transformation, setTransformation] = useState<Transformation>({
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  });

  const handleTransformationChange = (field: keyof Transformation, value: number) => {
    setTransformation((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApplyTransformation(transformation);
  };

  const handleReset = () => {
    setTransformation({
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const convertUnits = (value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial'): number => {
    if (from === to) return value;
    if (from === 'metric' && to === 'imperial') return value / 25.4; // mm to inches
    if (from === 'imperial' && to === 'metric') return value * 25.4; // inches to mm
    return value;
  };

  const formatValue = (value: number): string => {
    return value.toFixed(units === 'metric' ? 2 : 4);
  };

  const getUnitsLabel = (): string => {
    return units === 'metric' ? 'mm' : 'in';
  };

  const getZHeightColor = (index: number): string => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg">
      {/* Toolbar Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Transformation Tools</span>
          {selectedCommandsCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedCommandsCount} selected
            </Badge>
          )}
          <div className="flex items-center space-x-1 ml-4">
            <Ruler className="h-3 w-3 text-gray-500" />
            <button
              onClick={() => onUnitsChange?.(units === 'metric' ? 'imperial' : 'metric')}
              className="text-xs font-mono bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            >
              {units === 'metric' ? 'mm' : 'in'}
            </button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-6 w-6 p-0"
        >
          {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* File & Selection Info */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">File Information</h4>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {fileName ? fileName.split('.').pop()?.toUpperCase() || 'GCODE' : 'GCODE'}
                  </Badge>
                  {fileSize && (
                    <span className="text-xs text-gray-600">{formatFileSize(fileSize)}</span>
                  )}
                  {totalLines && (
                    <span className="text-xs text-gray-600">{totalLines} lines</span>
                  )}
                </div>
              </div>
              
              {selectionBounds && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selection Bounds</h4>
                  <div className="text-xs font-mono text-gray-600 space-y-1">
                    <div>X: {formatValue(convertUnits(selectionBounds.minX, 'metric', units))} - {formatValue(convertUnits(selectionBounds.maxX, 'metric', units))} {getUnitsLabel()}</div>
                    <div>Y: {formatValue(convertUnits(selectionBounds.minY, 'metric', units))} - {formatValue(convertUnits(selectionBounds.maxY, 'metric', units))} {getUnitsLabel()}</div>
                    <div>Z: {formatValue(convertUnits(selectionBounds.minZ, 'metric', units))} - {formatValue(convertUnits(selectionBounds.maxZ, 'metric', units))} {getUnitsLabel()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Transform Controls */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <Move className="h-3 w-3 mr-1" />
                Transform
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {/* Translation */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Translation ({getUnitsLabel()})</Label>
                  <div className="space-y-1">
                    <Input
                      placeholder="X"
                      type="number"
                      step="0.01"
                      value={transformation.translateX}
                      onChange={(e) => handleTransformationChange('translateX', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs font-mono"
                    />
                    <Input
                      placeholder="Y"
                      type="number"
                      step="0.01"
                      value={transformation.translateY}
                      onChange={(e) => handleTransformationChange('translateY', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs font-mono"
                    />
                    <Input
                      placeholder="Z"
                      type="number"
                      step="0.01"
                      value={transformation.translateZ}
                      onChange={(e) => handleTransformationChange('translateZ', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Rotation & Scale */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 flex items-center">
                    <RotateCw className="h-3 w-3 mr-1" />
                    Rotation (°)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={transformation.rotation}
                    onChange={(e) => handleTransformationChange('rotation', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs font-mono"
                  />
                  <Label className="text-xs text-gray-600 flex items-center mt-2">
                    <Scale className="h-3 w-3 mr-1" />
                    Scale
                  </Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Input
                      placeholder="X"
                      type="number"
                      step="0.01"
                      value={transformation.scaleX}
                      onChange={(e) => handleTransformationChange('scaleX', parseFloat(e.target.value) || 1)}
                      className="h-7 text-xs font-mono"
                    />
                    <Input
                      placeholder="Y"
                      type="number"
                      step="0.01"
                      value={transformation.scaleY}
                      onChange={(e) => handleTransformationChange('scaleY', parseFloat(e.target.value) || 1)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Actions</Label>
                  <div className="space-y-1">
                    <Button 
                      onClick={handleApply} 
                      size="sm"
                      className="w-full h-7 text-xs"
                      disabled={selectedCommandsCount === 0}
                    >
                      Apply Transform
                    </Button>
                    <Button 
                      onClick={handleReset} 
                      variant="outline" 
                      size="sm"
                      className="w-full h-7 text-xs"
                    >
                      Reset Values
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Z-Height Filter */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Z-Height Filter</h4>
              <div className="flex flex-wrap gap-2">
                {zHeights.map((z, index) => (
                  <label key={z} className="flex items-center cursor-pointer bg-gray-50 rounded px-2 py-1">
                    <Checkbox
                      checked={visibleZHeights.has(z)}
                      onCheckedChange={(checked) => onZHeightVisibilityChange(z, !!checked)}
                      className="mr-2"
                    />
                    <div className={`w-3 h-3 rounded mr-2 ${getZHeightColor(index)}`} />
                    <span className="text-xs">{formatValue(convertUnits(z, 'metric', units))}{getUnitsLabel()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}