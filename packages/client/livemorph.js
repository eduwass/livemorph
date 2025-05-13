/**
 * LiveMorph Client
 * Framework-agnostic live DOM morphing
 */
(function() {
  // Default configuration
  const defaultConfig = {
    host: 'localhost', // Can be overridden by config or server
    port: 4321,
    https: false,
    events: '/events',
    reconnectDelay: 2000,
    debug: false
  };

  // Client class
  class LiveMorphClient {
    constructor(options = {}) {
      this.config = { ...defaultConfig, ...options };
      this.eventSource = null;
      this.serverConfig = null;
      this.connected = false;
      this.connectAttempts = 0;
      
      // Debug logging
      this.log = (...args) => {
        if (this.config.debug) {
          console.log('[LiveMorph]', ...args);
        }
      };
      
      // Initialize
      this.connect();
    }
    
    connect() {
      // Use host and port from config or serverConfig
      const host = (this.serverConfig && this.serverConfig.host) || this.config.host;
      const port = (this.serverConfig && this.serverConfig.port) || this.config.port;
      const https = (this.serverConfig && typeof this.serverConfig.https === 'boolean') ? this.serverConfig.https : this.config.https;
      const protocol = https ? 'https://' : 'http://';
      const sseUrl = `${protocol}${host}:${port}${this.config.events}`;
      this.log('Connecting to SSE server:', sseUrl);
      this.connectAttempts++;
      
      try {
        // Create EventSource
        this.eventSource = new EventSource(sseUrl);
        
        // Connection opened
        this.eventSource.onopen = () => {
          this.log('SSE connection established');
          this.connected = true;
          this.connectAttempts = 0;
        };
        
        // Connection error
        this.eventSource.onerror = (e) => {
          this.log('SSE connection error, reconnecting...');
          this.connected = false;
          this.eventSource.close();
          
          // Exponential backoff for reconnection
          const delay = Math.min(
            this.config.reconnectDelay * Math.pow(1.5, this.connectAttempts),
            30000 // Max 30 seconds
          );
          
          setTimeout(() => this.connect(), delay);
        };
        
        // Connected event - initial handshake
        this.eventSource.addEventListener('connected', (e) => {
          const data = JSON.parse(e.data);
          this.log('Connected to server:', data.message);
          this.serverConfig = data.config || {};
          // If the server sends host/port/https, update config for future reconnects
          if (this.serverConfig.host) this.config.host = this.serverConfig.host;
          if (this.serverConfig.port) this.config.port = this.serverConfig.port;
          if (typeof this.serverConfig.https === 'boolean') this.config.https = this.serverConfig.https;
        });
        
        // File change event
        this.eventSource.addEventListener('filechange', (e) => {
          const data = JSON.parse(e.data);
          this.log('File change detected:', data);
          this.handleFileChange(data);
        });
      } catch (error) {
        this.log('Error connecting to SSE server:', error);
        setTimeout(() => this.connect(), this.config.reconnectDelay);
      }
    }
    
    handleFileChange(data) {
      const { file, action } = data;
      
      // Different handling based on the action
      switch(action) {
        case 'reload-page':
          this.log('Reloading page...');
          window.location.reload();
          break;
          
        case 'reload-css':
          this.log('Hot-reloading CSS...');
          this.reloadCSS();
          break;
          
        case 'morph-html':
          this.log('Morphing HTML...');
          this.fetchAndMorphHTML();
          break;
          
        default:
          this.log(`Unknown action: ${action}`);
      }
    }
    
    reloadCSS() {
      // Find all stylesheet links
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      // Add small delay to ensure new styles are applied
      Bun.sleep(200);
      links.forEach(link => {
        // Append or update timestamp parameter to force refresh
        const href = link.href;
        link.href = href.split('?')[0] + '?' + Date.now();
      });
    }
    
    async fetchAndMorphHTML() {
      if (!window.Idiomorph) {
        this.log('Idiomorph not found, cannot morph');
        return;
      }
      try {
        // Fetch the updated page HTML
        const response = await fetch(window.location.href, { headers: { 'X-LiveMorph': '1' } });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Use serverConfig.fragments to determine what to morph
        const fragments = this.serverConfig?.fragments || { main: '#main' };
        Object.entries(fragments).forEach(([key, selector]) => {
          const targetElement = document.querySelector(selector);
          const sourceElement = doc.querySelector(selector);
          if (!targetElement) {
            this.log(`Target element not found for selector: ${selector}`);
            return;
          }
          if (!sourceElement) {
            this.log(`Source element not found in new HTML for selector: ${selector}`);
            return;
          }
          this.log(`Morphing ${key} using selector: ${selector}`);
          window.Idiomorph.morph(targetElement, sourceElement, {
            // morphStyle: true,
            callbacks: {
              beforeNodeMorphed: (fromEl, toEl) => {
                // Don't morph the events container if it exists
                if (fromEl.id === 'events') return false;
                return true;
              }
            }
          });
        });
      } catch (error) {
        this.log('Error during HTML morphing:', error);
      }
    }
    
    disconnect() {
      if (this.eventSource) {
        this.log('Disconnecting from SSE server');
        this.eventSource.close();
        this.connected = false;
      }
    }
  }
  
  // Export to window
  window.LiveMorph = {
    Client: LiveMorphClient,
    create: (options) => new LiveMorphClient(options)
  };
})();

// Create LiveMorph client with settings from config
new LiveMorph.Client();