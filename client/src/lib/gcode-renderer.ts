import { GcodeCommand } from "@shared/schema";

export interface RenderSettings {
  width: number;
  height: number;
  padding: number;
  showGrid: boolean;
  showAxes: boolean;
  zHeightColors: Map<number, string>;
  selectedCommands: Set<number>;
}

export class GcodeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: RenderSettings;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context from canvas');
    this.ctx = ctx;

    this.settings = {
      width: canvas.width,
      height: canvas.height,
      padding: 40,
      showGrid: true,
      showAxes: true,
      zHeightColors: new Map(),
      selectedCommands: new Set(),
    };

    this.setupDefaultColors();
  }

  private setupDefaultColors() {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#8B5CF6', // purple
      '#F59E0B', // amber
      '#EF4444', // red
      '#06B6D4', // cyan
      '#84CC16', // lime
      '#EC4899', // pink
    ];

    let colorIndex = 0;
    this.settings.zHeightColors.set(0.2, colors[colorIndex++ % colors.length]);
    this.settings.zHeightColors.set(0.4, colors[colorIndex++ % colors.length]);
    this.settings.zHeightColors.set(0.6, colors[colorIndex++ % colors.length]);
  }

  updateSettings(settings: Partial<RenderSettings>) {
    Object.assign(this.settings, settings);
  }

  render(commands: GcodeCommand[]) {
    this.ctx.clearRect(0, 0, this.settings.width, this.settings.height);
    
    if (commands.length === 0) {
      this.renderEmptyState();
      return;
    }



    this.calculateBounds(commands);
    this.calculateTransform();

    if (this.settings.showGrid) {
      this.renderGrid();
    }

    if (this.settings.showAxes) {
      this.renderAxes();
    }

    this.renderToolpath(commands);
    this.renderSelection();
  }

  private calculateBounds(commands: GcodeCommand[]) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    commands.forEach(cmd => {
      if (cmd.x !== undefined) {
        minX = Math.min(minX, cmd.x);
        maxX = Math.max(maxX, cmd.x);
      }
      if (cmd.y !== undefined) {
        minY = Math.min(minY, cmd.y);
        maxY = Math.max(maxY, cmd.y);
      }
    });

    if (minX !== Infinity) {
      this.bounds = { minX, maxX, minY, maxY };
    }
  }

  private calculateTransform() {
    if (!this.bounds) return;

    const availableWidth = this.settings.width - 2 * this.settings.padding;
    const availableHeight = this.settings.height - 2 * this.settings.padding;
    
    const dataWidth = this.bounds.maxX - this.bounds.minX;
    const dataHeight = this.bounds.maxY - this.bounds.minY;

    if (dataWidth === 0 || dataHeight === 0) {
      this.scale = 1;
      this.offsetX = this.settings.width / 2;
      this.offsetY = this.settings.height / 2;
      return;
    }

    const scaleX = availableWidth / dataWidth;
    const scaleY = availableHeight / dataHeight;
    this.scale = Math.min(scaleX, scaleY) * 0.9; // Leave some margin

    this.offsetX = this.settings.padding + (availableWidth - dataWidth * this.scale) / 2 - this.bounds.minX * this.scale;
    this.offsetY = this.settings.padding + (availableHeight - dataHeight * this.scale) / 2 - this.bounds.minY * this.scale;
  }

  private worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.scale + this.offsetX,
      y: this.settings.height - (y * this.scale + this.offsetY), // Flip Y axis
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (this.settings.height - screenY - this.offsetY) / this.scale,
    };
  }

  private renderGrid() {
    if (!this.bounds) return;

    this.ctx.strokeStyle = 'hsl(220, 13%, 91%)';
    this.ctx.lineWidth = 0.5;

    const gridSize = this.calculateGridSize();
    
    // Vertical lines
    const startX = Math.floor(this.bounds.minX / gridSize) * gridSize;
    const endX = Math.ceil(this.bounds.maxX / gridSize) * gridSize;
    
    for (let x = startX; x <= endX; x += gridSize) {
      const screen1 = this.worldToScreen(x, this.bounds.minY);
      const screen2 = this.worldToScreen(x, this.bounds.maxY);
      
      this.ctx.beginPath();
      this.ctx.moveTo(screen1.x, screen1.y);
      this.ctx.lineTo(screen2.x, screen2.y);
      this.ctx.stroke();
    }

    // Horizontal lines
    const startY = Math.floor(this.bounds.minY / gridSize) * gridSize;
    const endY = Math.ceil(this.bounds.maxY / gridSize) * gridSize;
    
    for (let y = startY; y <= endY; y += gridSize) {
      const screen1 = this.worldToScreen(this.bounds.minX, y);
      const screen2 = this.worldToScreen(this.bounds.maxX, y);
      
      this.ctx.beginPath();
      this.ctx.moveTo(screen1.x, screen1.y);
      this.ctx.lineTo(screen2.x, screen2.y);
      this.ctx.stroke();
    }
  }

  private calculateGridSize(): number {
    if (!this.bounds) return 10;
    
    const dataWidth = this.bounds.maxX - this.bounds.minX;
    const targetGridLines = 10;
    const rawGridSize = dataWidth / targetGridLines;
    
    // Round to nice numbers
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawGridSize)));
    const normalized = rawGridSize / magnitude;
    
    if (normalized <= 1) return magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
  }

  private renderAxes() {
    if (!this.bounds) return;

    this.ctx.strokeStyle = 'hsl(215, 16%, 47%)';
    this.ctx.lineWidth = 2;
    this.ctx.font = '12px Inter';
    this.ctx.fillStyle = 'hsl(215, 16%, 47%)';

    const origin = this.worldToScreen(0, 0);
    const axisLength = 40;

    // X axis
    this.ctx.beginPath();
    this.ctx.moveTo(origin.x, origin.y);
    this.ctx.lineTo(origin.x + axisLength, origin.y);
    this.ctx.stroke();

    // X axis arrow
    this.ctx.beginPath();
    this.ctx.moveTo(origin.x + axisLength - 5, origin.y - 3);
    this.ctx.lineTo(origin.x + axisLength, origin.y);
    this.ctx.lineTo(origin.x + axisLength - 5, origin.y + 3);
    this.ctx.stroke();

    // Y axis
    this.ctx.beginPath();
    this.ctx.moveTo(origin.x, origin.y);
    this.ctx.lineTo(origin.x, origin.y - axisLength);
    this.ctx.stroke();

    // Y axis arrow
    this.ctx.beginPath();
    this.ctx.moveTo(origin.x - 3, origin.y - axisLength + 5);
    this.ctx.lineTo(origin.x, origin.y - axisLength);
    this.ctx.lineTo(origin.x + 3, origin.y - axisLength + 5);
    this.ctx.stroke();

    // Labels
    this.ctx.fillText('X', origin.x + axisLength + 5, origin.y + 5);
    this.ctx.fillText('Y', origin.x - 5, origin.y - axisLength - 5);
  }

  private renderToolpath(commands: GcodeCommand[]) {
    let currentPos = { x: 0, y: 0, z: 0 };
    let hasMovements = false;
    
    commands.forEach((cmd, index) => {
      // Store previous position before updating
      const prevPos = { ...currentPos };
      
      // Update current position
      if (cmd.x !== undefined) currentPos.x = cmd.x;
      if (cmd.y !== undefined) currentPos.y = cmd.y;
      if (cmd.z !== undefined) currentPos.z = cmd.z;

      // Check for movement commands (including G0)
      if (cmd.command.startsWith('G0') || cmd.command.startsWith('G00') ||
          cmd.command.startsWith('G1') || cmd.command.startsWith('G01')) {
        if (cmd.x !== undefined || cmd.y !== undefined) {
          this.renderMove(cmd, prevPos, index);
          hasMovements = true;
        }
      } else if (cmd.command.startsWith('G2') || cmd.command.startsWith('G3')) {
        this.renderArc(cmd, prevPos, index);
        hasMovements = true;
      }
    });


  }

  private renderMove(cmd: GcodeCommand, prevPos: { x: number; y: number; z: number }, index: number) {
    // Get the target position, using previous coordinates if not specified
    const targetX = cmd.x !== undefined ? cmd.x : prevPos.x;
    const targetY = cmd.y !== undefined ? cmd.y : prevPos.y;

    const isSelected = this.settings.selectedCommands.has(index);
    const color = this.getZHeightColor(prevPos.z);
    
    this.ctx.strokeStyle = isSelected ? 'hsl(14, 100%, 57%)' : color;
    this.ctx.lineWidth = isSelected ? 3 : 2;
    this.ctx.globalAlpha = isSelected ? 1 : 0.8;

    const start = this.worldToScreen(prevPos.x, prevPos.y);
    const end = this.worldToScreen(targetX, targetY);

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    this.ctx.globalAlpha = 1;
  }

  private renderArc(cmd: GcodeCommand, pos: { x: number; y: number; z: number }, index: number) {
    // Simplified arc rendering - in a real implementation, you'd parse I and J parameters
    this.renderMove(cmd, pos, index);
  }

  private getZHeightColor(z: number): string {
    // Find the closest Z height color
    let closestZ = 0;
    let minDiff = Infinity;

    for (const [zHeight] of Array.from(this.settings.zHeightColors.entries())) {
      const diff = Math.abs(z - zHeight);
      if (diff < minDiff) {
        minDiff = diff;
        closestZ = zHeight;
      }
    }

    return this.settings.zHeightColors.get(closestZ) || '#6B7280';
  }

  private renderSelection() {
    // This will be called by the parent component to render selection rectangles
  }

  renderSelectionRectangle(x1: number, y1: number, x2: number, y2: number) {
    const screen1 = this.worldToScreen(x1, y1);
    const screen2 = this.worldToScreen(x2, y2);

    this.ctx.strokeStyle = 'hsl(14, 100%, 57%)';
    this.ctx.fillStyle = 'hsla(14, 100%, 57%, 0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    const x = Math.min(screen1.x, screen2.x);
    const y = Math.min(screen1.y, screen2.y);
    const width = Math.abs(screen2.x - screen1.x);
    const height = Math.abs(screen2.y - screen1.y);

    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.setLineDash([]);
  }

  private renderEmptyState() {
    this.ctx.fillStyle = 'hsl(215, 16%, 47%)';
    this.ctx.font = '16px Inter';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'Load a G-Code file to see visualization',
      this.settings.width / 2,
      this.settings.height / 2
    );
    this.ctx.textAlign = 'start';
  }

  setZHeightColor(z: number, color: string) {
    this.settings.zHeightColors.set(z, color);
  }

  getZHeightColors(): Map<number, string> {
    return new Map(this.settings.zHeightColors);
  }

  getBounds(): { minX: number; maxX: number; minY: number; maxY: number } | null {
    return this.bounds;
  }
}
