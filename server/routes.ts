import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertGcodeFileSchema } from "@shared/schema";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept G-Code files
    const allowedExtensions = ['.gcode', '.nc', '.txt'];
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    cb(null, hasValidExtension);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve sample G-Code file
  app.get("/sample.gcode", (req, res) => {
    const sampleContent = `; Sample 3-axis G-Code file for testing
; Multi Z-height toolpath demonstration
G21 ; Set units to millimeters
G90 ; Absolute positioning
G28 ; Home all axes

; Initialize spindle
M3 S1000 ; Start spindle at 1000 RPM

; First layer at Z=0.2mm
G0 Z0.2 F800
G0 X0 Y0
G1 X10 Y0 F200
G1 X10 Y10
G1 X0 Y10
G1 X0 Y0

; Move to second layer at Z=0.4mm
G0 Z0.4
G0 X5 Y5
G1 X15 Y5 F200
G1 X15 Y15
G1 X5 Y15
G1 X5 Y5

; Third layer at Z=0.6mm
G0 Z0.6
G0 X2 Y2
G1 X8 Y2 F200
G1 X8 Y8
G1 X2 Y8
G1 X2 Y2

; Circular movements at different Z heights
G0 Z0.8
G0 X20 Y20
G2 X25 Y25 I2.5 J2.5 F150 ; Clockwise arc
G3 X20 Y20 I-2.5 J-2.5 ; Counter-clockwise arc

; Final positioning
G0 Z5 ; Raise to safe height
G0 X0 Y0 ; Return to origin
M5 ; Stop spindle
M30 ; End program`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'inline; filename="sample.gcode"');
    res.send(sampleContent);
  });
  
  // Get all G-Code files
  app.get("/api/gcode-files", async (req, res) => {
    try {
      const files = await storage.getGcodeFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve files" });
    }
  });

  // Get specific G-Code file
  app.get("/api/gcode-files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      const file = await storage.getGcodeFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve file" });
    }
  });

  // Upload G-Code file
  app.post("/api/gcode-files", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = req.file.buffer.toString('utf-8');
      const lineCount = content.split('\n').length;

      const fileData = {
        name: req.file.originalname,
        content,
        size: req.file.size,
        lineCount,
      };

      const validatedData = insertGcodeFileSchema.parse(fileData);
      const savedFile = await storage.createGcodeFile(validatedData);

      res.status(201).json(savedFile);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to upload file" });
      }
    }
  });

  // Update G-Code file content
  app.patch("/api/gcode-files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      const { content } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ message: "Content must be a string" });
      }

      const lineCount = content.split('\n').length;
      const size = Buffer.byteLength(content, 'utf-8');

      const updatedFile = await storage.updateGcodeFile(id, {
        content,
        lineCount,
        size,
      });

      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(updatedFile);
    } catch (error) {
      res.status(500).json({ message: "Failed to update file" });
    }
  });

  // Download G-Code file
  app.get("/api/gcode-files/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      const file = await storage.getGcodeFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.send(file.content);
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Delete G-Code file
  app.delete("/api/gcode-files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      const deleted = await storage.deleteGcodeFile(id);
      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
