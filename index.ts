import { createSSEHandler } from "bun-sse";
import { loadConfig } from "config";
import { createFileWatcher } from "file-watcher";
import { serveStatic } from "static-server";

// Initialize the application
async function init() {
  // Load configuration
  const config = await loadConfig();
  
  // Keep track of all connected SSE streams
  const connectedStreams: Set<any> = new Set();
  
  // Create an SSE handler for file change events
  const sseHandler = createSSEHandler(async (stream, req) => {
    console.log("Client connected to SSE stream");
    
    // Add this stream to our connected streams
    connectedStreams.add(stream);
    
    // Remove stream when connection closes
    req.signal.addEventListener('abort', () => {
      console.log("Removing stream from connected streams");
      connectedStreams.delete(stream);
    });
    
    // Send an initial connection event with config
    stream.event("connected", {
      timestamp: Date.now(),
      message: "Connected to LiveMorph SSE server",
      config: {
        fragments: config.fragments
      }
    });
    
    // The client remains connected until the request is aborted
    while (!req.signal.aborted) {
      await Bun.sleep(1000);
    }
    
    console.log("Client disconnected from SSE stream");
    connectedStreams.delete(stream);
  });

  // Function to broadcast events to all connected clients
  function broadcastEvent(eventName: string, data: any) {
    console.log(`Broadcasting ${eventName} event to ${connectedStreams.size} clients`);
    
    for (const stream of connectedStreams) {
      try {
        stream.event(eventName, data);
      } catch (error) {
        console.error("Error sending event to client:", error);
      }
    }
  }

  // Create server
  const server = Bun.serve({
    port: config.server.port,
    idleTimeout: 0, // Prevent connections from timing out
    fetch: async (req) => {
      const url = new URL(req.url);
      
      // Handle SSE stream endpoint
      if (url.pathname === "/events") {
        // Enable CORS for SSE endpoint
        if (req.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type"
            }
          });
        }
        
        return sseHandler(req);
      }
      
      // Try to serve static files
      const staticResponse = await serveStatic(req);
      if (staticResponse) {
        return staticResponse;
      }
      
      // Handle all other routes with 404
      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`LiveMorph server running at http://localhost:${config.server.port}`);
  console.log(`Open http://localhost:${config.server.port} in your browser to see the test page`);

  // Initialize the file watcher
  const watcher = createFileWatcher(
    {
      paths: config.watch.paths,
      ignore: config.watch.ignore,
      actions: config.actions
    },
    (event) => {
      // Broadcast the file change event to all connected clients
      broadcastEvent("filechange", event);
    }
  );

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("Shutting down LiveMorph server...");
    watcher.close();
    server.stop();
    process.exit(0);
  });
}

// Start the application
init().catch(error => {
  console.error("Error starting LiveMorph:", error);
  process.exit(1);
});