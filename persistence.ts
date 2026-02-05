import { AppState, SavedTree } from './types';

const STORAGE_KEY = 'rcca-helper-state';

export function loadAppState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
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
        resolve(data as SavedTree[]);
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
        resolve(data);
      } catch {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
