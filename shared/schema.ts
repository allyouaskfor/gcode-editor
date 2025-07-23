import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const gcodeFiles = pgTable("gcode_files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  size: integer("size").notNull(),
  lineCount: integer("line_count").notNull(),
});

export const insertGcodeFileSchema = createInsertSchema(gcodeFiles).pick({
  name: true,
  content: true,
  size: true,
  lineCount: true,
});

export type InsertGcodeFile = z.infer<typeof insertGcodeFileSchema>;
export type GcodeFile = typeof gcodeFiles.$inferSelect;

// G-Code command types
export const gcodeCommandSchema = z.object({
  line: z.number(),
  command: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
  f: z.number().optional(), // feed rate
  e: z.number().optional(), // extrusion
  s: z.number().optional(), // spindle speed
  comment: z.string().optional(),
  raw: z.string(),
});

export type GcodeCommand = z.infer<typeof gcodeCommandSchema>;

// Selection region type
export const selectionRegionSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  zMin: z.number().optional(),
  zMax: z.number().optional(),
});

export type SelectionRegion = z.infer<typeof selectionRegionSchema>;

// Transformation type
export const transformationSchema = z.object({
  translateX: z.number().default(0),
  translateY: z.number().default(0),
  translateZ: z.number().default(0),
  rotation: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
});

export type Transformation = z.infer<typeof transformationSchema>;
