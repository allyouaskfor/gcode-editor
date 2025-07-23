# G-Code Editor Application

## Overview

This is a full-stack G-Code file editor and visualization application built with React, Express, and TypeScript. The application allows users to upload, edit, visualize, and transform G-Code files commonly used in CNC machining and 3D printing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints for G-Code file operations
- **File Handling**: Multer for multipart/form-data uploads
- **Development**: Hot reload with Vite middleware integration

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM (Active)
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon Database serverless PostgreSQL
- **Production Storage**: DatabaseStorage class using PostgreSQL
- **Development Storage**: MemStorage class for testing (available but not active)

## Key Components

### G-Code Processing
- **Parser**: Custom G-Code parser that extracts commands, coordinates, and metadata
- **Renderer**: Canvas-based 2D visualization with zoom, pan, and selection tools
- **Transformation Engine**: Mathematical transformations (translate, rotate, scale)
- **Command Analysis**: Line-by-line parsing with syntax highlighting

### File Management
- **Upload System**: Multi-format G-Code file support (.gcode, .nc, .txt)
- **Validation**: File size limits (10MB) and extension filtering
- **Storage Interface**: Abstracted storage layer supporting both memory and database backends

### User Interface
- **Code Editor**: Syntax-highlighted G-Code editor with search functionality
- **Visualization Panel**: Interactive 2D canvas with selection tools
- **Transformation Panel**: UI controls for geometric transformations
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Data Flow

1. **File Upload**: Users upload G-Code files via multipart form submission
2. **Parsing**: Server parses G-Code content into structured command objects
3. **Storage**: File metadata and content stored in PostgreSQL database
4. **Visualization**: Client-side renderer creates 2D path visualization on HTML5 canvas
5. **Editing**: Users can select lines, apply transformations, and modify coordinates
6. **Export**: Modified G-Code can be downloaded or saved back to server

## External Dependencies

### Core Technologies
- **Database**: Neon Database (serverless PostgreSQL)
- **UI Components**: Radix UI primitives for accessibility
- **Validation**: Zod schema validation library
- **Icons**: Lucide React icon library

### Development Tools
- **Type Checking**: TypeScript with strict mode enabled
- **Code Formatting**: ESBuild for production bundling
- **Development Server**: Vite with HMR and error overlay

### Replit Integration
- **Error Handling**: Runtime error modal for development
- **Cartographer**: Code navigation and mapping (development only)
- **Banner**: Development environment detection

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev` starts Express server with Vite middleware
- **Hot Reload**: Full-stack development with automatic reloading
- **Database**: Uses DATABASE_URL environment variable for connection

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Deployment**: Single Node.js process serves both API and static files
- **Environment**: Production mode disables development-only features

### Database Management
- **Migrations**: Drizzle Kit handles schema changes
- **Push Command**: `npm run db:push` applies schema to database
- **Connection**: Serverless PostgreSQL via @neondatabase/serverless

## Recent Changes

### January 23, 2025
- **Database Integration**: Added PostgreSQL database support
  - Created `server/db.ts` with Neon Database connection
  - Updated `server/storage.ts` to use DatabaseStorage instead of MemStorage
  - Applied database schema using `npm run db:push`
  - All G-Code files now persist in PostgreSQL database
  - Maintained backward compatibility with IStorage interface

- **Fixed Toolpath Rendering**: Resolved visualization issue where G-Code paths weren't displaying
  - Fixed position tracking logic in GcodeRenderer to properly track previous and current positions
  - Added support for G0 rapid movement commands in addition to G1 linear moves
  - Improved coordinate handling for proper line rendering

- **Enhanced Units System**: Implemented proper metric/imperial unit interpretation
  - Updated GcodeParser to accept units parameter during parsing
  - Imperial G-Code values now interpreted as inches and converted to internal mm storage
  - Added automatic reparsing when units toggle changes
  - Units toggle now affects entire interface: coordinate display, selection bounds, Z-heights
  - Removed complex conversion logic in favor of parser-level unit interpretation

The application follows a modern full-stack architecture with clear separation between client and server code, while maintaining flexibility for both development and production deployment scenarios.