import { useState } from "react";
import { Transformation } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  MousePointer, 
  Square, 
  Circle, 
  Move,
  RotateCw,
  Scale
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
    setTransformation(prev => ({ ...prev, [field]: value }));
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

  const getZHeightColor = (index: number): string => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];
    return colors[index % colors.length];
  };

  return (
    <Card className="w-72 bg-white shadow-lg border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-base">
          <Settings className="h-4 w-4 text-primary mr-2" />
          Transformation Tools
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* File Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">File Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Format:</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {fileName ? fileName.split('.').pop()?.toUpperCase() || 'GCODE' : 'GCODE'}
              </Badge>
            </div>
            {fileSize && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Size:</span>
                <span className="font-mono">{formatFileSize(fileSize)}</span>
              </div>
            )}
            {totalLines && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Lines:</span>
                <span className="font-mono">{totalLines}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Selection Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Selection</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Selected Lines:</span>
              <span className="font-medium">{selectedCommandsCount}</span>
            </div>
            {selectionBounds && (
              <>
                <div className="text-xs text-gray-600 mt-2">Bounds:</div>
                <div className="font-mono text-xs space-y-1">
                  <div>X: {selectionBounds.minX.toFixed(1)} - {selectionBounds.maxX.toFixed(1)} mm</div>
                  <div>Y: {selectionBounds.minY.toFixed(1)} - {selectionBounds.maxY.toFixed(1)} mm</div>
                  <div>Z: {selectionBounds.minZ.toFixed(1)} - {selectionBounds.maxZ.toFixed(1)} mm</div>
                </div>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Selection Tools */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Selection Tools</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="flex items-center justify-center">
              <MousePointer className="h-3 w-3 mr-1" />
              Select
            </Button>
            <Button variant="outline" size="sm" className="flex items-center justify-center">
              <Square className="h-3 w-3 mr-1" />
              Rectangle
            </Button>
            <Button variant="outline" size="sm" className="flex items-center justify-center">
              <Circle className="h-3 w-3 mr-1" />
              Circle
            </Button>
            <Button variant="outline" size="sm" className="flex items-center justify-center">
              <Move className="h-3 w-3 mr-1" />
              Polygon
            </Button>
          </div>
        </div>

        <Separator />

        {/* Transformation Controls */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Move className="h-3 w-3 mr-1" />
            Transform
          </h4>
          <div className="space-y-4">
            {/* Translation */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Translation (mm)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="translateX" className="text-xs">X</Label>
                  <Input
                    id="translateX"
                    type="number"
                    step="0.01"
                    value={transformation.translateX}
                    onChange={(e) => handleTransformationChange('translateX', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="translateY" className="text-xs">Y</Label>
                  <Input
                    id="translateY"
                    type="number"
                    step="0.01"
                    value={transformation.translateY}
                    onChange={(e) => handleTransformationChange('translateY', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="translateZ" className="text-xs">Z</Label>
                <Input
                  id="translateZ"
                  type="number"
                  step="0.01"
                  value={transformation.translateZ}
                  onChange={(e) => handleTransformationChange('translateZ', parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Rotation */}
            <div>
              <Label htmlFor="rotation" className="text-xs text-gray-600 flex items-center">
                <RotateCw className="h-3 w-3 mr-1" />
                Rotation (degrees)
              </Label>
              <Input
                id="rotation"
                type="number"
                step="0.1"
                value={transformation.rotation}
                onChange={(e) => handleTransformationChange('rotation', parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600 flex items-center">
                <Scale className="h-3 w-3 mr-1" />
                Scale
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="scaleX" className="text-xs">X</Label>
                  <Input
                    id="scaleX"
                    type="number"
                    step="0.01"
                    value={transformation.scaleX}
                    onChange={(e) => handleTransformationChange('scaleX', parseFloat(e.target.value) || 1)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="scaleY" className="text-xs">Y</Label>
                  <Input
                    id="scaleY"
                    type="number"
                    step="0.01"
                    value={transformation.scaleY}
                    onChange={(e) => handleTransformationChange('scaleY', parseFloat(e.target.value) || 1)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button 
                onClick={handleApply} 
                className="flex-1 h-8 text-xs"
                disabled={selectedCommandsCount === 0}
              >
                Apply
              </Button>
              <Button 
                onClick={handleReset} 
                variant="outline" 
                className="h-8 text-xs px-3"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Z-Height Filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Z-Height Filter</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {zHeights.map((z, index) => (
              <div key={z} className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <Checkbox
                    checked={visibleZHeights.has(z)}
                    onCheckedChange={(checked) => onZHeightVisibilityChange(z, !!checked)}
                    className="mr-2"
                  />
                  <div className={`w-3 h-3 rounded mr-2 ${getZHeightColor(index)}`} />
                  <span className="text-sm">{z.toFixed(1)}mm</span>
                </label>
                <span className="text-xs text-gray-500">
                  {/* This would show the count of lines at this Z height */}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
