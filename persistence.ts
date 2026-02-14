import { AppState, AppSettings, AppStateV2, Project, SavedTree, SavedTreeV2 } from './types';

const STORAGE_KEY = 'rcca-helper-state';
const DEFAULT_PROJECT_ID = 'default-project';
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

// Migrate V1 (flat trees) to V2 (with projects)
function migrateV1toV2(v1State: AppState): AppStateV2 {
  const now = new Date().toISOString();

  const defaultProject: Project = {
    id: DEFAULT_PROJECT_ID,
    name: 'Default Project',
    description: 'Migrated investigations',
    createdAt: now,
    updatedAt: now,
  };

  const migratedTrees: SavedTreeV2[] = v1State.trees.map(tree => ({
    ...migrateTree(tree),
    projectId: DEFAULT_PROJECT_ID,
  }));

  return {
    version: 2,
    activeProjectId: DEFAULT_PROJECT_ID,
    activeTreeId: v1State.activeTreeId,
    projects: [defaultProject],
    trees: migratedTrees,
  };
}

export function loadAppState(): AppStateV2 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Check if V1 (no version field) - migrate to V2
    if (!('version' in parsed)) {
      const v1State = parsed as AppState;
      const migratedState = migrateV1toV2(v1State);
      // Save migrated state immediately
      saveAppState(migratedState);
      return migratedState;
    }

    // Already V2
    const state = parsed as AppStateV2;
    return {
      ...state,
      trees: state.trees.map(tree => ({
        ...migrateTree(tree),
        projectId: tree.projectId
      }))
    };
  } catch {
    return null;
  }
}

export function saveAppState(state: AppStateV2): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createDefaultProject(): Project {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_PROJECT_ID,
    name: 'Default Project',
    createdAt: now,
    updatedAt: now,
  };
}

export function exportProjectAsJson(project: Project, trees: SavedTreeV2[]): void {
  const projectTrees = trees.filter(t => t.projectId === project.id);
  const exportData = {
    type: 'rcca-project',
    project,
    trees: projectTrees
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_Project_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ProjectImportData {
  type: 'rcca-project';
  project: Project;
  trees: SavedTreeV2[];
}

export function parseProjectImportFile(file: File): Promise<ProjectImportData | SavedTree[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);

        // Check if it's a project export
        if (data.type === 'rcca-project' && data.project && data.trees) {
          resolve(data as ProjectImportData);
          return;
        }

        // Otherwise treat as legacy tree(s) import
        const candidates: unknown[] = Array.isArray(data) ? data : [data];
        if (candidates.length === 0) {
          reject(new Error('File contains no data'));
          return;
        }

        const validated: SavedTree[] = [];
        for (const item of candidates) {
          const tree = item as SavedTree;
          if (!tree.treeData || !tree.id || !tree.name) {
            reject(new Error(`Invalid investigation in file: "${(item as { name?: string }).name || 'unknown'}"`));
            return;
          }
          validated.push(migrateTree(tree));
        }
        resolve(validated);
      } catch {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
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

export function parseImportFile(file: File): Promise<SavedTree[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const candidates: unknown[] = Array.isArray(data) ? data : [data];

        if (candidates.length === 0) {
          reject(new Error('File contains no investigations'));
          return;
        }

        const validated: SavedTree[] = [];
        for (const item of candidates) {
          const tree = item as SavedTree;
          if (!tree.treeData || !tree.id || !tree.name) {
            reject(new Error(`Invalid investigation in file: "${(item as { name?: string }).name || 'unknown'}"`));
            return;
          }
          validated.push(migrateTree(tree));
        }

        resolve(validated);
      } catch {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
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
