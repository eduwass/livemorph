# LiveMorph

Framework-agnostic live DOM morphing dev server.

## Getting Started

This project is currently in development. The first step implements a simple SSE (Server-Sent Events) timer to demonstrate the basic functionality.

### Prerequisites

- [Bun](https://bun.sh/) - Make sure you have Bun installed on your system

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd livemorph

# Install dependencies
bun install
```

### Running the Demo

```bash
# Start the development server
bun run index.ts
```

Then open your browser at http://localhost:4321 to see the timer demo.

## Features Implemented

- [x] Basic SSE server using bun-sse
- [x] Simple timer example
- [ ] File watching functionality
- [ ] DOM morphing with idiomorph
- [ ] CSS hot-swapping
- [ ] Configuration file support
- [ ] Command-line interface

## License

This project is licensed under the MIT License.
