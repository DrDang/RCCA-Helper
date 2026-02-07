import { AppState, AppSettings, SavedTree } from './types';

const STORAGE_KEY = 'rcca-helper-state';
const SETTINGS_KEY = 'rcca-helper-settings';
const LAST_EXPORT_KEY = 'rcca-helper-last-export';

export const DEFAULT_SETTINGS: AppSettings = {
  autoBackupEnabled: false,
  autoBackupIntervalMinutes: 15,
  projectFileName: 'RCCA_Backup',
  theme: 'light',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getLastExportTimestamp(): string | null {
  return localStorage.getItem(LAST_EXPORT_KEY);
}

export function setLastExportTimestamp(): void {
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
}

// Ensure backward compatibility by adding resolutions array if missing
function migrateTree(tree: SavedTree): SavedTree {
  return {
    ...tree,
    resolutions: tree.resolutions ?? []
  };
}

export function loadAppState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as AppState;
    // Migrate all trees to ensure resolutions array exists
    return {
      ...state,
      trees: state.trees.map(migrateTree)
    };
  } catch {
    return null;
  }
}

export function saveAppState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportAllTreesAsJson(trees: SavedTree[]): void {
  const blob = new Blob([JSON.stringify(trees, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RCCA_All_Investigations_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllTreesFromJson(file: File): Promise<SavedTree[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data) || data.length === 0) {
          reject(new Error('Invalid bulk export file: expected an array of investigations'));
          return;
        }
        for (const tree of data) {
          if (!tree.treeData || !tree.id || !tree.name) {
            reject(new Error(`Invalid tree in file: "${tree.name || 'unknown'}"`));
            return;
          }
        }
        // Migrate all trees for backward compatibility
        resolve((data as SavedTree[]).map(migrateTree));
      } catch {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function exportTreeAsJson(tree: SavedTree): void {
  const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tree.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importTreeFromJson(file: File): Promise<SavedTree> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as SavedTree;
        if (!data.treeData || !data.id || !data.name) {
          reject(new Error('Invalid tree file format'));
          return;
        }
        // Migrate tree for backward compatibility
        resolve(migrateTree(data));
      } catch {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
