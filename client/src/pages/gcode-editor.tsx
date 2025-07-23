import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GcodeCommand, GcodeFile, Transformation } from "@shared/schema";
import { GcodeParser } from "@/lib/gcode-parser";
import { TransformationUtils } from "@/lib/transformation-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CodeEditor } from "@/components/code-editor";
import { VisualizationPanel } from "@/components/visualization-panel";
import { TransformationPanel } from "@/components/transformation-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FolderOpen, 
  Save, 
  Download,
  Box,
  AlertCircle,
  FileText
} from "lucide-react";

export default function GcodeEditor() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentFile, setCurrentFile] = useState<GcodeFile | null>(null);
  const [commands, setCommands] = useState<GcodeCommand[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [zHeights, setZHeights] = useState<number[]>([]);
  const [visibleZHeights, setVisibleZHeights] = useState<Set<number>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiRequest('POST', '/api/gcode-files', formData);
      return response.json();
    },
    onSuccess: (data: GcodeFile) => {
      setCurrentFile(data);
      const parsedCommands = GcodeParser.parse(data.content);
      setCommands(parsedCommands);
      
      const heights = GcodeParser.getZHeights(parsedCommands);
      setZHeights(heights);
      setVisibleZHeights(new Set(heights));
      
      setSelectedLines(new Set());
      setHasUnsavedChanges(false);
      
      toast({
        title: "File loaded successfully",
        description: `${data.name} (${data.lineCount} lines)`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/gcode-files'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to load file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // File update mutation
  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentFile) throw new Error('No file loaded');
      
      const response = await apiRequest('PATCH', `/api/gcode-files/${currentFile.id}`, {
        content,
      });
      return response.json();
    },
    onSuccess: (data: GcodeFile) => {
      setCurrentFile(data);
      setHasUnsavedChanges(false);
      
      toast({
        title: "File saved successfully",
        description: data.name,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/gcode-files'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to save file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    // Reset input value so the same file can be selected again
    event.target.value = '';
  }, [uploadMutation]);

  const handleLineSelect = useCallback((lineNumber: number, selected: boolean) => {
    setSelectedLines(prev => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(lineNumber);
      } else {
        newSelection.delete(lineNumber);
      }
      return newSelection;
    });
  }, []);

  const handleSelectionChange = useCallback((selectedIndices: number[]) => {
    setSelectedLines(new Set(selectedIndices));
  }, []);

  const handleZHeightVisibilityChange = useCallback((zHeight: number, visible: boolean) => {
    setVisibleZHeights(prev => {
      const newVisible = new Set(prev);
      if (visible) {
        newVisible.add(zHeight);
      } else {
        newVisible.delete(zHeight);
      }
      return newVisible;
    });
  }, []);

  const handleApplyTransformation = useCallback((transformation: Transformation) => {
    if (selectedLines.size === 0) {
      toast({
        title: "No selection",
        description: "Please select some G-Code lines to transform",
        variant: "destructive",
      });
      return;
    }

    const selectedIndices = Array.from(selectedLines);
    const transformedCommands = TransformationUtils.applyTransformationToRegion(
      commands,
      selectedIndices,
      transformation
    );

    setCommands(transformedCommands);
    setHasUnsavedChanges(true);

    toast({
      title: "Transformation applied",
      description: `Transformed ${selectedIndices.length} commands`,
    });
  }, [commands, selectedLines, toast]);

  const handleSave = useCallback(() => {
    if (!currentFile || !hasUnsavedChanges) return;

    const newContent = TransformationUtils.reconstructGcodeContent(commands);
    updateMutation.mutate(newContent);
  }, [currentFile, commands, hasUnsavedChanges, updateMutation]);

  const handleDownload = useCallback(() => {
    if (!currentFile) return;

    const content = TransformationUtils.reconstructGcodeContent(commands);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "File downloaded",
      description: currentFile.name,
    });
  }, [currentFile, commands, toast]);

  const handleLoadSample = useCallback(async () => {
    try {
      const response = await fetch('/sample.gcode');
      if (!response.ok) {
        throw new Error('Failed to fetch sample file');
      }
      
      const content = await response.text();
      const file = new File([content], 'sample.gcode', { type: 'text/plain' });
      uploadMutation.mutate(file);
    } catch (error) {
      toast({
        title: "Failed to load sample",
        description: "Could not load the sample G-Code file",
        variant: "destructive",
      });
    }
  }, [uploadMutation, toast]);

  const selectionBounds = selectedLines.size > 0 
    ? TransformationUtils.calculateSelectionBounds(commands, Array.from(selectedLines))
    : null;

  const selectionInfo = selectedLines.size > 0 && selectionBounds
    ? `${selectedLines.size} lines selected (Z: ${selectionBounds.minZ.toFixed(1)}-${selectionBounds.maxZ.toFixed(1)}mm)`
    : selectedLines.size > 0
    ? `${selectedLines.size} lines selected`
    : 'No selection';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 flex items-center">
              <Box className="text-primary mr-2 h-5 w-5" />
              G-Code Editor Pro
            </h1>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleFileUpload}
                disabled={uploadMutation.isPending}
                className="flex items-center"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {uploadMutation.isPending ? 'Loading...' : 'Load G-Code'}
              </Button>
              <Button 
                onClick={handleLoadSample}
                disabled={uploadMutation.isPending}
                variant="secondary"
                className="flex items-center"
              >
                <FileText className="mr-2 h-4 w-4" />
                Load Sample
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!currentFile || !hasUnsavedChanges || updateMutation.isPending}
                variant="secondary"
                className="flex items-center"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                onClick={handleDownload}
                disabled={!currentFile}
                variant="outline"
                className="flex items-center"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Code Editor */}
          <div className="w-1/2">
            <CodeEditor
              commands={commands}
              selectedLines={selectedLines}
              onLineSelect={handleLineSelect}
              fileName={currentFile?.name}
            />
          </div>

          {/* Right Panel - Visualization */}
          <div className="w-1/2">
            <VisualizationPanel
              commands={commands}
              selectedLines={selectedLines}
              onSelectionChange={handleSelectionChange}
              zHeights={zHeights}
              visibleZHeights={visibleZHeights}
            />
          </div>
        </div>

        {/* Bottom Docked Transformation Toolbar */}
        <TransformationPanel
          zHeights={zHeights}
          visibleZHeights={visibleZHeights}
          onZHeightVisibilityChange={handleZHeightVisibilityChange}
          selectedCommandsCount={selectedLines.size}
          selectionBounds={selectionBounds}
          onApplyTransformation={handleApplyTransformation}
          fileName={currentFile?.name}
          fileSize={currentFile?.size}
          totalLines={currentFile?.lineCount}
          isCollapsed={isToolbarCollapsed}
          onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
          units={units}
          onUnitsChange={setUnits}
        />
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Selection:</span>
              <span className="text-sm text-gray-600">{selectionInfo}</span>
            </div>
            {selectionBounds && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Bounds:</span>
                <span className="text-sm text-gray-600 font-mono">
                  X: {selectionBounds.minX.toFixed(1)}-{selectionBounds.maxX.toFixed(1)}, 
                  Y: {selectionBounds.minY.toFixed(1)}-{selectionBounds.maxY.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Z-Height Legend */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Z-Heights:</span>
              {zHeights.slice(0, 6).map((z, index) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];
                return (
                  <div key={z} className="flex items-center space-x-1">
                    <div className={`w-3 h-3 ${colors[index % colors.length]} rounded`} />
                    <span className="text-xs">{z.toFixed(1)}mm</span>
                  </div>
                );
              })}
              {zHeights.length > 6 && (
                <span className="text-xs text-gray-500">+{zHeights.length - 6} more</span>
              )}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unsaved changes
                </Badge>
              )}
              {currentFile && (
                <Badge variant="outline" className="text-xs">
                  {commands.length} lines
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".gcode,.nc,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
