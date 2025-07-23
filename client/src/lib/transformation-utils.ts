import { GcodeCommand, Transformation } from "@shared/schema";

export class TransformationUtils {
  static applyTransformation(commands: GcodeCommand[], transformation: Transformation): GcodeCommand[] {
    return commands.map(cmd => {
      if (cmd.x === undefined || cmd.y === undefined) return cmd;

      // Apply rotation first (around origin)
      let x = cmd.x;
      let y = cmd.y;
      
      if (transformation.rotation !== 0) {
        const angle = (transformation.rotation * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        
        x = rotatedX;
        y = rotatedY;
      }

      // Apply scaling
      x *= transformation.scaleX;
      y *= transformation.scaleY;

      // Apply translation
      x += transformation.translateX;
      y += transformation.translateY;

      // Update Z coordinate if specified
      let z = cmd.z;
      if (z !== undefined && transformation.translateZ !== 0) {
        z += transformation.translateZ;
      }

      // Regenerate the raw G-Code line
      const newRaw = this.regenerateGcodeLine(cmd, x, y, z);

      return {
        ...cmd,
        x: parseFloat(x.toFixed(3)),
        y: parseFloat(y.toFixed(3)),
        z: z !== undefined ? parseFloat(z.toFixed(3)) : undefined,
        raw: newRaw,
      };
    });
  }

  static applyTransformationToRegion(
    commands: GcodeCommand[], 
    selectedIndices: number[], 
    transformation: Transformation
  ): GcodeCommand[] {
    const result = [...commands];
    
    selectedIndices.forEach(index => {
      if (index >= 0 && index < result.length) {
        const cmd = result[index];
        if (cmd.x === undefined || cmd.y === undefined) return;

        let x = cmd.x;
        let y = cmd.y;
        
        // Apply rotation
        if (transformation.rotation !== 0) {
          const angle = (transformation.rotation * Math.PI) / 180;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          
          const rotatedX = x * cos - y * sin;
          const rotatedY = x * sin + y * cos;
          
          x = rotatedX;
          y = rotatedY;
        }

        // Apply scaling
        x *= transformation.scaleX;
        y *= transformation.scaleY;

        // Apply translation
        x += transformation.translateX;
        y += transformation.translateY;

        // Update Z coordinate if specified
        let z = cmd.z;
        if (z !== undefined && transformation.translateZ !== 0) {
          z += transformation.translateZ;
        }

        // Regenerate the raw G-Code line
        const newRaw = this.regenerateGcodeLine(cmd, x, y, z);

        result[index] = {
          ...cmd,
          x: parseFloat(x.toFixed(3)),
          y: parseFloat(y.toFixed(3)),
          z: z !== undefined ? parseFloat(z.toFixed(3)) : undefined,
          raw: newRaw,
        };
      }
    });

    return result;
  }

  private static regenerateGcodeLine(originalCmd: GcodeCommand, x: number, y: number, z?: number): string {
    let line = originalCmd.command;

    if (x !== undefined) {
      line += ` X${x.toFixed(3)}`;
    }
    if (y !== undefined) {
      line += ` Y${y.toFixed(3)}`;
    }
    if (z !== undefined) {
      line += ` Z${z.toFixed(3)}`;
    }
    if (originalCmd.f !== undefined) {
      line += ` F${originalCmd.f}`;
    }
    if (originalCmd.e !== undefined) {
      line += ` E${originalCmd.e.toFixed(3)}`;
    }
    if (originalCmd.s !== undefined) {
      line += ` S${originalCmd.s}`;
    }

    if (originalCmd.comment) {
      line += ` ; ${originalCmd.comment}`;
    }

    return line;
  }

  static reconstructGcodeContent(commands: GcodeCommand[]): string {
    return commands.map(cmd => {
      if (cmd.command === '' && cmd.comment) {
        return `; ${cmd.comment}`;
      }
      return cmd.raw;
    }).join('\n');
  }

  static calculateSelectionBounds(commands: GcodeCommand[], selectedIndices: number[]): {
    minX: number;
    maxX: number;
    minY: number;  
    maxY: number;
    minZ: number;
    maxZ: number;
  } | null {
    if (selectedIndices.length === 0) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    selectedIndices.forEach(index => {
      const cmd = commands[index];
      if (!cmd) return;

      if (cmd.x !== undefined) {
        minX = Math.min(minX, cmd.x);
        maxX = Math.max(maxX, cmd.x);
      }
      if (cmd.y !== undefined) {
        minY = Math.min(minY, cmd.y);
        maxY = Math.max(maxY, cmd.y);
      }
      if (cmd.z !== undefined) {
        minZ = Math.min(minZ, cmd.z);
        maxZ = Math.max(maxZ, cmd.z);
      }
    });

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
