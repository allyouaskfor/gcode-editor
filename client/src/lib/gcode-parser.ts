import { GcodeCommand } from "@shared/schema";

export class GcodeParser {
  static parse(content: string): GcodeCommand[] {
    const lines = content.split('\n');
    const commands: GcodeCommand[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith(';')) {
        // Skip empty lines and comments (but still record them)
        if (trimmedLine.startsWith(';')) {
          commands.push({
            line: index + 1,
            command: '',
            comment: trimmedLine.substring(1).trim(),
            raw: trimmedLine,
          });
        }
        return;
      }

      const command = this.parseLine(trimmedLine, index + 1);
      if (command) {
        commands.push(command);
      }
    });

    return commands;
  }

  private static parseLine(line: string, lineNumber: number): GcodeCommand | null {
    const commentIndex = line.indexOf(';');
    let codePart = line;
    let comment: string | undefined;

    if (commentIndex !== -1) {
      codePart = line.substring(0, commentIndex).trim();
      comment = line.substring(commentIndex + 1).trim();
    }

    if (!codePart) return null;

    // Extract command (G, M, T, etc.)
    const commandMatch = codePart.match(/^([GMT]\d+)/i);
    if (!commandMatch) return null;

    const command = commandMatch[1].toUpperCase();
    const params = this.extractParameters(codePart);

    return {
      line: lineNumber,
      command,
      x: params.X,
      y: params.Y,
      z: params.Z,
      f: params.F,
      e: params.E,
      s: params.S,
      comment,
      raw: line,
    };
  }

  private static extractParameters(line: string): Record<string, number> {
    const params: Record<string, number> = {};
    
    // Match parameter patterns like X10.5, Y-5.2, Z0.1, etc.
    const paramMatches = Array.from(line.matchAll(/([XYZFEST])(-?\d+\.?\d*)/gi));
    
    for (const match of paramMatches) {
      const param = match[1].toUpperCase();
      const value = parseFloat(match[2]);
      if (!isNaN(value)) {
        params[param] = value;
      }
    }

    return params;
  }

  static getZHeights(commands: GcodeCommand[]): number[] {
    const zHeights = new Set<number>();
    
    commands.forEach(cmd => {
      if (cmd.z !== undefined) {
        zHeights.add(cmd.z);
      }
    });

    return Array.from(zHeights).sort((a, b) => a - b);
  }

  static getCommandsInRegion(
    commands: GcodeCommand[], 
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number
  ): GcodeCommand[] {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return commands.filter(cmd => {
      if (cmd.x === undefined || cmd.y === undefined) return false;
      
      return cmd.x >= minX && cmd.x <= maxX && 
             cmd.y >= minY && cmd.y <= maxY;
    });
  }

  static getBounds(commands: GcodeCommand[]): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } | null {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let hasCoordinates = false;

    commands.forEach(cmd => {
      if (cmd.x !== undefined) {
        minX = Math.min(minX, cmd.x);
        maxX = Math.max(maxX, cmd.x);
        hasCoordinates = true;
      }
      if (cmd.y !== undefined) {
        minY = Math.min(minY, cmd.y);
        maxY = Math.max(maxY, cmd.y);
        hasCoordinates = true;
      }
      if (cmd.z !== undefined) {
        minZ = Math.min(minZ, cmd.z);
        maxZ = Math.max(maxZ, cmd.z);
        hasCoordinates = true;
      }
    });

    if (!hasCoordinates) return null;

    return {
      minX: minX === Infinity ? 0 : minX,
      maxX: maxX === -Infinity ? 0 : maxX,
      minY: minY === Infinity ? 0 : minY,
      maxY: maxY === -Infinity ? 0 : maxY,
      minZ: minZ === Infinity ? 0 : minZ,
      maxZ: maxZ === -Infinity ? 0 : maxZ,
    };
  }
}
