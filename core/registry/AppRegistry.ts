import { AppBlueprint } from '../blueprint/AppBlueprint';

const STORAGE_KEY = 'astra_apps';

// Helper functions for localStorage
function loadApps(): Map<string, AppBlueprint> {
  if (typeof window === 'undefined') {
    return new Map();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return new Map();
    }
    const appsArray: AppBlueprint[] = JSON.parse(stored);
    return new Map(appsArray.map(app => [app.id, app]));
  } catch {
    return new Map();
  }
}

function saveApps(apps: Map<string, AppBlueprint>): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const appsArray = Array.from(apps.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appsArray));
  } catch (error) {
    console.error('Failed to save apps to localStorage:', error);
  }
}

export class AppRegistry {
  /**
   * Create a new app with a default blueprint
   */
  static createApp(name?: string): AppBlueprint {
    const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Generate default name with incrementing number if not provided
    if (!name) {
      const allApps = this.listApps();
      const newAppNumbers = allApps
        .map(app => {
          const match = app.name.match(/^New App (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);
      
      const nextNumber = newAppNumbers.length > 0 
        ? Math.max(...newAppNumbers) + 1 
        : 1;
      name = `New App ${nextNumber}`;
    }
    
    const defaultPage = {
      id: 'home',
      name: 'Home',
      title: 'Home',
      path: '/',
      content: 'Welcome to your new app. This is the home page.',
      components: [],
    };
    
    const blueprint: AppBlueprint = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      pages: [defaultPage],
      layout: {
        previewMode: 'desktop',
        viewportWidth: 1920,
        viewportHeight: 1080,
      },
    };

    console.log('[AppRegistry] Creating app with pages:', blueprint.pages);
    
    const apps = loadApps();
    apps.set(id, blueprint);
    saveApps(apps);
    
    console.log('[AppRegistry] App created and saved. Pages count:', blueprint.pages.length);
    return blueprint;
  }

  /**
   * Get an app by ID
   */
  static getApp(id: string): AppBlueprint | null {
    const apps = loadApps();
    const app = apps.get(id) || null;
    
    if (app) {
      // Migration: Ensure app has at least one page
      if (!app.pages || app.pages.length === 0) {
        console.log('[AppRegistry] Migrating app: adding default home page');
        app.pages = [
          {
            id: 'home',
            name: 'Home',
            title: 'Home',
            path: '/',
            content: 'Welcome to your new app. This is the home page.',
            components: [],
          },
        ];
        app.updatedAt = new Date().toISOString();
        apps.set(id, app);
        saveApps(apps);
      }
      console.log('[AppRegistry] Loaded app:', app.id, 'Pages:', app.pages.length, app.pages);
    }
    
    return app;
  }

  /**
   * Update an app
   */
  static updateApp(id: string, updates: Partial<AppBlueprint>): AppBlueprint | null {
    const apps = loadApps();
    const app = apps.get(id);
    if (!app) {
      return null;
    }

    const updated: AppBlueprint = {
      ...app,
      ...updates,
      id: app.id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString(),
    };

    apps.set(id, updated);
    saveApps(apps);
    return updated;
  }

  /**
   * List all apps
   */
  static listApps(): AppBlueprint[] {
    const apps = loadApps();
    return Array.from(apps.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Delete an app
   */
  static deleteApp(id: string): boolean {
    const apps = loadApps();
    const deleted = apps.delete(id);
    if (deleted) {
      saveApps(apps);
    }
    return deleted;
  }
}

