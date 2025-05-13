import { resolve } from "path";
import { extname } from "path";

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Default MIME type
const DEFAULT_MIME = "application/octet-stream";

// Serve static files from the current directory
export async function serveStatic(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  let path = url.pathname;
  
  // Prevent directory traversal attacks
  if (path.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }
  
  // Default to index.html for root path
  if (path === "/") {
    path = "/test.html";
  }
  
  // Remove leading slash and resolve path
  const filePath = resolve(process.cwd(), path.substring(1));
  
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    
    if (!exists) {
      return null; // Let the main handler deal with 404
    }
    
    // Determine content type based on file extension
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || DEFAULT_MIME;
    
    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    console.error(`Error serving static file ${filePath}:`, error);
    return new Response("Server Error", { status: 500 });
  }
} 