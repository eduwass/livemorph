import { createSSEHandler } from "bun-sse";

// Create an SSE handler that emits a timer event every second
const sseHandler = createSSEHandler(async (stream, req) => {
  console.log("Client connected to SSE stream");
  let count = 0;
  // Keep emitting timer events until the connection is closed
  while (!req.signal.aborted) {
    // Emit a timer event with the current count and timestamp
    stream.event("timer", {
      count: count++,
      timestamp: Date.now(),
    });
    // Wait for 1 second before the next event
    await Bun.sleep(1000);
  }
  console.log("Client disconnected from SSE stream");
});

// Create a simple server
Bun.serve({
  port: 4321,
  fetch(req) {
    const url = new URL(req.url);
    // Handle SSE stream endpoint
    if (url.pathname === "/events") {
      return sseHandler(req);
    }
    // Handle other routes
    return new Response("Not found", { status: 404 });
  },
});

console.log("LiveMorph SSE server running at http://localhost:4321");