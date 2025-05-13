import { resolve } from "path";

export interface LiveMorphConfig {
  host: string; // Hostname or IP
  port: number; // Port number
  https: boolean; // Use HTTPS
  watch: {
    paths: string[];
    ignore: string[];
  };
  actions: Record<string, string>;
  fragments: Record<string, string>;
}

// Default configuration
const defaultConfig: LiveMorphConfig = {
  host: "localhost",
  port: 4321,
  https: false,
  watch: {
    paths: ["**/*.php", "**/*.html", "**/*.css", "**/*.js"],
    ignore: ["node_modules/**", ".git/**"]
  },
  actions: {
    "**/*.php": "morph-html",
    "**/*.html": "morph-html",
    "**/*.css": "reload-css",
    "**/*.js": "reload-page"
  },
  fragments: {
    main: "#main",
    content: "#content",
    header: "header",
    footer: "footer"
  }
};

// Load configuration from file
export async function loadConfig(): Promise<LiveMorphConfig> {
  try {
    const configPath = resolve(process.cwd(), "livemorph.config.json");
    const fileConfig = await Bun.file(configPath).json();
    console.log("Loaded configuration from livemorph.config.json");
    
    // Merge with defaults (deep merge for nested objects)
    return {
      ...defaultConfig,
      ...fileConfig,
      watch: {
        ...defaultConfig.watch,
        ...(fileConfig.watch || {}),
      },
      actions: {
        ...defaultConfig.actions,
        ...(fileConfig.actions || {})
      },
      fragments: {
        ...defaultConfig.fragments,
        ...(fileConfig.fragments || {})
      }
    };
  } catch (error) {
    console.log("No valid configuration found, using defaults");
    return defaultConfig;
  }
} 