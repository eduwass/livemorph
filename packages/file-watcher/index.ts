import { watch } from "fs";
import { resolve } from "path";

// Simple glob pattern matcher
function isMatch(filename: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*\*/g, '~~~') // Temporarily replace ** with something unlikely
    .replace(/\*/g, '[^/]*') // Replace * with regex for anything except /
    .replace(/~~~/g, '.*');  // Replace ** (now ~~~) with regex for anything

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filename);
}

// Helper to check if file matches any of the patterns
function matchesAnyPattern(filename: string, patterns: string[]): boolean {
  return patterns.some(pattern => isMatch(filename, pattern));
}

// Helper to get the action for a file based on pattern matching
function getActionForFile(filename: string, actions: Record<string, string>): string {
  for (const [pattern, action] of Object.entries(actions)) {
    if (isMatch(filename, pattern)) {
      return action;
    }
  }
  return "reload-page"; // Default action
}

export interface FileWatcherOptions {
  paths: string[];
  ignore: string[];
  actions: Record<string, string>;
}

export interface FileChangeEvent {
  file: string;
  eventType: string;
  timestamp: number;
  action: string;
}

export function createFileWatcher(
  options: FileWatcherOptions, 
  onChange: (event: FileChangeEvent) => void
) {
  const watchOptions = {
    recursive: true
  };

  // Create debounced version of the onChange function to avoid rapid successive events
  let debounceTimer: any = null;
  let pendingEvents: Map<string, { eventType: string, action: string }> = new Map();
  
  function debouncedOnChange(filename: string, eventType: string, action: string) {
    // Store the latest event for this file
    pendingEvents.set(filename, { eventType, action });
    
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Set new timer
    debounceTimer = setTimeout(() => {
      // Dispatch all pending events
      for (const [file, data] of pendingEvents.entries()) {
        console.log(`Dispatching debounced event for ${file}`);
        onChange({
          file,
          eventType: data.eventType,
          timestamp: Date.now(),
          action: data.action
        });
      }
      
      // Clear pending events
      pendingEvents.clear();
    }, 100); // 100ms debounce
  }

  // Initialize the file watcher
  const watcher = watch(
    process.cwd(),
    watchOptions,
    (eventType, filename) => {
      if (!filename) return;
      
      // Ignore files not matching watch patterns or matching ignore patterns
      if (
        !matchesAnyPattern(filename, options.paths) ||
        matchesAnyPattern(filename, options.ignore)
      ) {
        return;
      }
      
      console.log(`Detected ${eventType} in ${filename}`);
      
      // Get appropriate action for this file
      const action = getActionForFile(filename, options.actions);
      
      // Use debounced broadcast to avoid rapid events
      debouncedOnChange(filename, eventType, action);
    }
  );

  return {
    close: () => {
      watcher.close();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    }
  };
} 