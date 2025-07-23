import { gcodeFiles, type GcodeFile, type InsertGcodeFile } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getGcodeFile(id: number): Promise<GcodeFile | undefined>;
  getGcodeFiles(): Promise<GcodeFile[]>;
  createGcodeFile(file: InsertGcodeFile): Promise<GcodeFile>;
  updateGcodeFile(id: number, file: Partial<InsertGcodeFile>): Promise<GcodeFile | undefined>;
  deleteGcodeFile(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private files: Map<number, GcodeFile>;
  private currentId: number;

  constructor() {
    this.files = new Map();
    this.currentId = 1;
  }

  async getGcodeFile(id: number): Promise<GcodeFile | undefined> {
    return this.files.get(id);
  }

  async getGcodeFiles(): Promise<GcodeFile[]> {
    return Array.from(this.files.values());
  }

  async createGcodeFile(insertFile: InsertGcodeFile): Promise<GcodeFile> {
    const id = this.currentId++;
    const file: GcodeFile = { ...insertFile, id };
    this.files.set(id, file);
    return file;
  }

  async updateGcodeFile(id: number, updateData: Partial<InsertGcodeFile>): Promise<GcodeFile | undefined> {
    const existingFile = this.files.get(id);
    if (!existingFile) return undefined;

    const updatedFile: GcodeFile = { ...existingFile, ...updateData };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteGcodeFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  async getGcodeFile(id: number): Promise<GcodeFile | undefined> {
    const [file] = await db.select().from(gcodeFiles).where(eq(gcodeFiles.id, id));
    return file || undefined;
  }

  async getGcodeFiles(): Promise<GcodeFile[]> {
    return await db.select().from(gcodeFiles);
  }

  async createGcodeFile(insertFile: InsertGcodeFile): Promise<GcodeFile> {
    const [file] = await db
      .insert(gcodeFiles)
      .values(insertFile)
      .returning();
    return file;
  }

  async updateGcodeFile(id: number, updateData: Partial<InsertGcodeFile>): Promise<GcodeFile | undefined> {
    const [file] = await db
      .update(gcodeFiles)
      .set(updateData)
      .where(eq(gcodeFiles.id, id))
      .returning();
    return file || undefined;
  }

  async deleteGcodeFile(id: number): Promise<boolean> {
    const result = await db
      .delete(gcodeFiles)
      .where(eq(gcodeFiles.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
