import { useState, useEffect, useRef } from "react";
import { GcodeCommand } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText } from "lucide-react";

interface CodeEditorProps {
  commands: GcodeCommand[];
  selectedLines: Set<number>;
  onLineSelect: (lineNumber: number, selected: boolean) => void;
  fileName?: string;
}

export function CodeEditor({ commands, selectedLines, onLineSelect, fileName }: CodeEditorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm) {
      const results: number[] = [];
      commands.forEach((cmd, index) => {
        if (cmd.raw.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cmd.comment && cmd.comment.toLowerCase().includes(searchTerm.toLowerCase()))) {
          results.push(index);
        }
      });
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
    }
  }, [searchTerm, commands]);

  const scrollToLine = (lineIndex: number) => {
    const lineElement = document.getElementById(`line-${lineIndex}`);
    if (lineElement && editorRef.current) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex - 1 < 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);
    scrollToLine(searchResults[newIndex]);
  };

  const formatGcodeLine = (cmd: GcodeCommand, index: number) => {
    if (cmd.command === '' && cmd.comment) {
      return (
        <span key={index} className="text-green-400">
          ; {cmd.comment}
        </span>
      );
    }

    const parts = [];
    
    // Command
    if (cmd.command) {
      parts.push(
        <span key="cmd" className="text-blue-300 font-medium">
          {cmd.command}
        </span>
      );
    }

    // Parameters
    if (cmd.x !== undefined) {
      parts.push(
        <span key="x" className="text-yellow-300 ml-1">
          X{cmd.x.toFixed(3)}
        </span>
      );
    }
    if (cmd.y !== undefined) {
      parts.push(
        <span key="y" className="text-yellow-300 ml-1">
          Y{cmd.y.toFixed(3)}
        </span>
      );
    }
    if (cmd.z !== undefined) {
      parts.push(
        <span key="z" className="text-yellow-300 ml-1">
          Z{cmd.z.toFixed(3)}
        </span>
      );
    }
    if (cmd.f !== undefined) {
      parts.push(
        <span key="f" className="text-yellow-300 ml-1">
          F{cmd.f}
        </span>
      );
    }
    if (cmd.e !== undefined) {
      parts.push(
        <span key="e" className="text-yellow-300 ml-1">
          E{cmd.e.toFixed(3)}
        </span>
      );
    }
    if (cmd.s !== undefined) {
      parts.push(
        <span key="s" className="text-yellow-300 ml-1">
          S{cmd.s}
        </span>
      );
    }

    // Comment
    if (cmd.comment) {
      parts.push(
        <span key="comment" className="text-green-400 ml-2">
          ; {cmd.comment}
        </span>
      );
    }

    return <span key={index}>{parts}</span>;
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <h2 className="font-medium text-gray-900">G-Code Editor</h2>
          </div>
          <span className="text-sm text-gray-500">
            {fileName || 'untitled.gcode'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            Lines: {commands.length}
          </span>
          <div className="flex items-center space-x-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-7 w-32 text-xs"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSearch('prev')}
                  className="h-7 w-7 p-0"
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSearch('next')}
                  className="h-7 w-7 p-0"
                >
                  ↓
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={editorRef} className="flex">
            {/* Line Numbers */}
            <div className="bg-gray-100 px-3 py-2 text-xs font-mono text-gray-500 border-r border-gray-200 select-none">
              {commands.map((_, index) => {
                const isSelected = selectedLines.has(index);
                const isSearchResult = searchResults.includes(index);
                const isCurrentSearch = searchResults[currentSearchIndex] === index;
                
                return (
                  <div
                    key={index}
                    className={`leading-5 px-1 cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-white rounded'
                        : isCurrentSearch
                        ? 'bg-yellow-300 text-gray-900 rounded'
                        : isSearchResult
                        ? 'bg-yellow-100 text-gray-900 rounded'
                        : 'hover:bg-gray-200'
                    }`}
                    onClick={() => onLineSelect(index, !isSelected)}
                  >
                    {index + 1}
                  </div>
                );
              })}
            </div>

            {/* Code Content */}
            <div className="flex-1 p-2 font-mono text-sm bg-gray-900 text-white overflow-x-auto">
              {commands.map((cmd, index) => {
                const isSelected = selectedLines.has(index);
                const isSearchResult = searchResults.includes(index);
                const isCurrentSearch = searchResults[currentSearchIndex] === index;
                
                return (
                  <div
                    key={index}
                    id={`line-${index}`}
                    className={`leading-5 px-1 cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 bg-opacity-20'
                        : isCurrentSearch
                        ? 'bg-yellow-400 bg-opacity-20'
                        : isSearchResult
                        ? 'bg-yellow-300 bg-opacity-10'
                        : 'hover:bg-gray-800'
                    }`}
                    onClick={() => onLineSelect(index, !isSelected)}
                  >
                    {formatGcodeLine(cmd, index)}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
