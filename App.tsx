import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TreeVisualizer } from './components/TreeVisualizer';
import { InspectorPanel } from './components/InspectorPanel';
import { TreeManager } from './components/TreeManager';
import { ProjectSelector } from './components/ProjectSelector';
import { DashboardView } from './components/DashboardView';
import { ResolutionsSummary } from './components/ResolutionsSummary';
import { InvestigationActionsSummary } from './components/InvestigationActionsSummary';
import { CauseNode, ActionItem, Note, IssueStatus, NodeStatus, NodeType, SavedTree, SavedTreeV2, AppSettings, ResolutionItem, Project } from './types';
import { createInitialTree } from './constants';
import { chooseJsonOpenFile, chooseJsonSaveFile, createProjectExportData, downloadJson, FileSystemFileHandleLike, getProjectFileName, isDirectFileSaveSupported, saveAppState, exportTreeAsJson, exportAllTreesAsJson, parseImportFile, loadSettings, saveSettings, getLastExportTimestamp, setLastExportTimestamp, DEFAULT_SETTINGS, exportProjectAsJson, parseProjectImportFile, ProjectImportData, writeJsonToFile } from './persistence';
import { generateSingleReport, generateBulkReport, openReportInNewTab } from './reportGenerator';
import { SettingsModal } from './components/SettingsModal';
import { ImportDialog } from './components/ImportDialog';
import { FolderOpen, GitBranch, LayoutDashboard, FileText, Settings, Moon, Sun, Shield, ClipboardList, PanelRightOpen, Save, Plus } from 'lucide-react';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [trees, setTrees] = useState<SavedTreeV2[]>([]);
  const [activeTreeId, setActiveTreeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [currentView, setCurrentView] = useState<'tree' | 'dashboard' | 'investigate' | 'resolutions'>('tree');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [lastExportTimestamp, setLastExportTs] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorWidth, setInspectorWidth] = useState(450);
  const [importCandidates, setImportCandidates] = useState<SavedTree[] | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [pendingNavigation, setPendingNavigation] = useState<null | (() => void)>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const startupFileInputRef = useRef<HTMLInputElement>(null);
  const suppressUnsavedRef = useRef(false);
  const projectSaveHandleRef = useRef<{ projectId: string; handle: FileSystemFileHandleLike } | null>(null);

  // Load preferences on mount. Project data must be opened from a JSON file each session.
  useEffect(() => {
    setSettings(loadSettings());
    setLastExportTs(getLastExportTimestamp());
    setInitialized(true);
  }, []);

  // Apply theme class to <html>
  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [settings.theme]);

  // Track unsaved changes
  useEffect(() => {
    if (!initialized) return;
    if (projects.length === 0) return;
    if (suppressUnsavedRef.current) {
      suppressUnsavedRef.current = false;
      return;
    }
    setHasUnsavedChanges(true);
  }, [trees, projects]);

  // Auto-save interval: write to the active project's saved file when available, otherwise fall back to backup download.
  useEffect(() => {
    if (!settings.autoBackupEnabled || !initialized || trees.length === 0) return;
    const intervalMs = settings.autoBackupIntervalMinutes * 60 * 1000;
    const timer = setInterval(() => {
      if (!hasUnsavedChanges) return;

      void (async () => {
        const saveHandle = projectSaveHandleRef.current?.projectId === activeProjectId
          ? projectSaveHandleRef.current.handle
          : null;
        const project = projects.find(p => p.id === activeProjectId);

        try {
          if (saveHandle && project) {
            await writeJsonToFile(saveHandle, createProjectExportData(project, trees));
          } else {
            const prefix = settings.projectFileName || 'RCCA_Backup';
            downloadJson(trees, `${prefix.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`);
          }

          saveAppState({ version: 2, activeProjectId, activeTreeId, projects, trees });
          setLastExportTimestamp();
          setLastExportTs(new Date().toISOString());
          setHasUnsavedChanges(false);
        } catch (err) {
          console.warn('Auto-save failed; falling back to backup download.', err);
          const prefix = settings.projectFileName || 'RCCA_Backup';
          downloadJson(trees, `${prefix.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`);
          setLastExportTimestamp();
          setLastExportTs(new Date().toISOString());
          setHasUnsavedChanges(false);
        }
      })();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [settings.autoBackupEnabled, settings.autoBackupIntervalMinutes, settings.projectFileName, initialized, projects, trees, activeProjectId, activeTreeId, hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Debounced auto-save to localStorage
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialized || projects.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveAppState({ version: 2, activeProjectId, activeTreeId, projects, trees });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [trees, projects, activeTreeId, activeProjectId, initialized]);

  // Derive active project and its trees
  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;
  const projectTrees = trees.filter(t => t.projectId === activeProjectId);

  // Derive active tree data
  const activeTree = projectTrees.find(t => t.id === activeTreeId) ?? null;
  const treeData = activeTree?.treeData ?? null;
  const actions = activeTree?.actions ?? [];
  const notes = activeTree?.notes ?? [];
  const resolutions = activeTree?.resolutions ?? [];

  // Flatten tree to get all root causes for resolution linking
  const flattenTree = (node: CauseNode): CauseNode[] => {
    const result = [node];
    if (node.children) {
      for (const child of node.children) {
        result.push(...flattenTree(child));
      }
    }
    return result;
  };
  const allNodes = treeData ? flattenTree(treeData) : [];
  const allRootCauses = allNodes.filter(n => n.isRootCause === true && (!n.children || n.children.length === 0));

  const getTreeActivityScore = (tree: SavedTreeV2): number => {
    const countNodes = (node: CauseNode): number =>
      1 + (node.children?.reduce((total, child) => total + countNodes(child), 0) ?? 0);

    const rootHasSpecificLabel = tree.treeData.label.trim() !== '' && tree.treeData.label !== 'New Issue';
    return countNodes(tree.treeData)
      + tree.actions.length * 3
      + tree.notes.length * 2
      + (tree.resolutions ?? []).length * 3
      + (rootHasSpecificLabel ? 5 : 0);
  };

  const getInitialTreeId = (candidateTrees: SavedTreeV2[]): string | null => {
    if (candidateTrees.length === 0) return null;

    return [...candidateTrees].sort((a, b) => {
      const scoreDelta = getTreeActivityScore(b) - getTreeActivityScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })[0].id;
  };

  const handleSaveProject = useCallback(async () => {
    if (!activeProject) return;

    const exportData = createProjectExportData(activeProject, trees);
    const fileName = getProjectFileName(activeProject);
    setSaveStatus('saving');

    try {
      let saveHandle = projectSaveHandleRef.current?.projectId === activeProject.id
        ? projectSaveHandleRef.current.handle
        : null;

      if (!saveHandle && isDirectFileSaveSupported()) {
        saveHandle = await chooseJsonSaveFile(fileName);
        if (saveHandle) {
          projectSaveHandleRef.current = { projectId: activeProject.id, handle: saveHandle };
        }
      }

      if (saveHandle) {
        await writeJsonToFile(saveHandle, exportData);
      } else {
        downloadJson(exportData, fileName);
      }

      saveAppState({ version: 2, activeProjectId, activeTreeId, projects, trees });
      setLastExportTimestamp();
      setLastExportTs(new Date().toISOString());
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus('idle'), 1800);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setSaveStatus('idle');
        return;
      }
      console.error(err);
      alert('Save failed. Please try Export from the project menu.');
      setSaveStatus('idle');
    }
  }, [activeProject, activeProjectId, activeTreeId, projects, trees]);

  const loadWorkspaceFromJsonFile = useCallback(async (file: File, handle: FileSystemFileHandleLike | null = null) => {
    setOpenError(null);

    const result = await parseProjectImportFile(file);
    const now = new Date().toISOString();

    let openedProject: Project;
    let openedTrees: SavedTreeV2[];

    if ('type' in result && result.type === 'rcca-project') {
      const importData = result as ProjectImportData;
      openedProject = {
        ...importData.project,
        id: importData.project.id || crypto.randomUUID(),
        updatedAt: importData.project.updatedAt || now,
      };
      openedTrees = importData.trees.map(tree => ({
        ...tree,
        projectId: openedProject.id,
      }));
    } else {
      const importedTrees = result as SavedTree[];
      const projectName = file.name.replace(/\.json$/i, '').replace(/[_-]+/g, ' ').trim() || 'Imported Project';
      openedProject = {
        id: crypto.randomUUID(),
        name: projectName,
        createdAt: now,
        updatedAt: now,
      };
      openedTrees = importedTrees.map(tree => ({
        ...tree,
        projectId: openedProject.id,
      })) as SavedTreeV2[];
    }

    const initialTreeId = getInitialTreeId(openedTrees);

    suppressUnsavedRef.current = true;
    setProjects([openedProject]);
    setTrees(openedTrees);
    setActiveProjectId(openedProject.id);
    setActiveTreeId(initialTreeId);
    setSelectedNodeId(null);
    setCurrentView('tree');
    projectSaveHandleRef.current = handle ? { projectId: openedProject.id, handle } : null;
    saveAppState({
      version: 2,
      activeProjectId: openedProject.id,
      activeTreeId: initialTreeId,
      projects: [openedProject],
      trees: openedTrees,
    });
    setHasUnsavedChanges(false);
  }, []);

  const handleOpenJsonFile = useCallback(async () => {
    setOpenError(null);
    setIsOpeningFile(true);

    try {
      const opened = await chooseJsonOpenFile();
      if (opened) {
        await loadWorkspaceFromJsonFile(opened.file, opened.handle);
      } else {
        startupFileInputRef.current?.click();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setOpenError(err instanceof Error ? err.message : 'Failed to open JSON file');
    } finally {
      setIsOpeningFile(false);
    }
  }, [loadWorkspaceFromJsonFile]);

  const handleStartupFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setOpenError(null);
    setIsOpeningFile(true);
    try {
      await loadWorkspaceFromJsonFile(file);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Failed to open JSON file');
    } finally {
      setIsOpeningFile(false);
    }
  };

  const guardedNavigate = useCallback((action: () => void) => {
    if (!hasUnsavedChanges) {
      action();
      return;
    }
    setPendingNavigation(() => action);
  }, [hasUnsavedChanges]);

  const handleSaveAndContinue = async () => {
    await handleSaveProject();
    pendingNavigation?.();
    setPendingNavigation(null);
  };

  const handleLeaveWithoutSaving = () => {
    pendingNavigation?.();
    setHasUnsavedChanges(false);
    setPendingNavigation(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSaveProject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveProject]);

  // Helper to update the active tree within the trees array
  const updateActiveTree = useCallback((updater: (tree: SavedTree) => SavedTree) => {
    setTrees(prev => prev.map(t =>
      t.id === activeTreeId
        ? { ...updater(t), updatedAt: new Date().toISOString() }
        : t
    ));
  }, [activeTreeId]);

  // Helper to find a node by ID recursively
  const findNode = (root: CauseNode, id: string): CauseNode | null => {
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getSelectedNode = useCallback(() => {
    if (!selectedNodeId || !treeData) return null;
    return findNode(treeData, selectedNodeId);
  }, [treeData, selectedNodeId]);

  // Update a specific node in the immutable tree structure
  const updateTree = (root: CauseNode, updatedNode: CauseNode): CauseNode => {
    if (root.id === updatedNode.id) {
      return updatedNode;
    }
    if (root.children) {
      return {
        ...root,
        children: root.children.map(child => updateTree(child, updatedNode))
      };
    }
    return root;
  };

  // Add a child node
  const addChildNode = (parentId: string) => {
    const newNode: CauseNode = {
      id: crypto.randomUUID(),
      parentId,
      label: 'New Cause',
      description: '',
      rationale: '',
      status: NodeStatus.PENDING,
      type: NodeType.CAUSE,
      children: []
    };

    const addRecursive = (node: CauseNode): CauseNode => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode]
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(addRecursive)
        };
      }
      return node;
    };

    updateActiveTree(tree => ({
      ...tree,
      treeData: addRecursive(tree.treeData)
    }));
    setSelectedNodeId(newNode.id);
  };

  // Delete a node with confirmation
  const deleteNode = (nodeId: string) => {
    if (!treeData) return;

    if (nodeId === treeData.id) {
      alert("Cannot delete the root issue.");
      return;
    }

    const nodeToDelete = findNode(treeData, nodeId);
    const childCount = nodeToDelete?.children?.length ?? 0;
    const message = childCount > 0
      ? `Delete "${nodeToDelete?.label}" and its ${childCount} child node(s)?`
      : `Delete "${nodeToDelete?.label}"?`;

    if (!window.confirm(message)) return;

    const deleteRecursive = (node: CauseNode): CauseNode => {
      if (!node.children) return node;
      return {
        ...node,
        children: node.children
          .filter(child => child.id !== nodeId)
          .map(deleteRecursive)
      };
    };

    updateActiveTree(tree => ({
      ...tree,
      treeData: deleteRecursive(tree.treeData)
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleUpdateNode = (updatedNode: CauseNode) => {
    const normalizedNode = updatedNode.isRootCause && updatedNode.children && updatedNode.children.length > 0
      ? { ...updatedNode, isRootCause: false }
      : updatedNode;

    updateActiveTree(tree => ({
      ...tree,
      treeData: updateTree(tree.treeData, normalizedNode),
      isResolved: normalizedNode.id === tree.treeData.id
        ? normalizedNode.status === IssueStatus.RESOLVED || normalizedNode.status === IssueStatus.CLOSED
        : tree.isResolved,
    }));
  };

  // Action Helpers
  const handleAddAction = (action: ActionItem) => {
    updateActiveTree(tree => ({
      ...tree,
      actions: [...tree.actions, action]
    }));
  };
  const handleUpdateAction = (updated: ActionItem) => {
    updateActiveTree(tree => ({
      ...tree,
      actions: tree.actions.map(a => a.id === updated.id ? updated : a)
    }));
  };
  const handleDeleteAction = (id: string) => {
    updateActiveTree(tree => ({
      ...tree,
      actions: tree.actions.filter(a => a.id !== id)
    }));
  };

  // Note Helpers
  const handleAddNote = (note: Note) => {
    updateActiveTree(tree => ({
      ...tree,
      notes: [...tree.notes, note]
    }));
  };
  const handleDeleteNote = (id: string) => {
    updateActiveTree(tree => ({
      ...tree,
      notes: tree.notes.filter(n => n.id !== id)
    }));
  };

  // Resolution Helpers
  const handleAddResolution = (resolution: ResolutionItem) => {
    updateActiveTree(tree => ({
      ...tree,
      resolutions: [...(tree.resolutions ?? []), resolution]
    }));
  };
  const handleUpdateResolution = (updated: ResolutionItem) => {
    updateActiveTree(tree => ({
      ...tree,
      resolutions: (tree.resolutions ?? []).map(r =>
        r.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : r
      )
    }));
  };
  const handleDeleteResolution = (id: string) => {
    updateActiveTree(tree => ({
      ...tree,
      resolutions: (tree.resolutions ?? []).filter(r => r.id !== id)
    }));
  };

  // Project management handlers
  const createProjectWithInitialInvestigation = (projectName: string) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: projectName,
      createdAt: now,
      updatedAt: now,
    };
    const initialTree: SavedTreeV2 = {
      id: crypto.randomUUID(),
      projectId: newProject.id,
      name: 'New Investigation',
      createdAt: now,
      updatedAt: now,
      treeData: createInitialTree('New Investigation'),
      actions: [],
      notes: [],
      resolutions: [],
    };

    projectSaveHandleRef.current = null;
    setProjects(prev => [...prev, newProject]);
    setTrees(prev => [...prev, initialTree]);
    setActiveProjectId(newProject.id);
    setActiveTreeId(initialTree.id);
    setSelectedNodeId(null);
    setCurrentView('tree');
  };

  const handleCreateProject = () => {
    const name = prompt('Project name:', 'New Project')?.trim();
    if (!name) return;
    createProjectWithInitialInvestigation(name);
  };
  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert('Cannot delete the last project.');
      return;
    }
    const project = projects.find(p => p.id === id);
    const treeCount = trees.filter(t => t.projectId === id).length;
    const message = treeCount > 0
      ? `Delete project "${project?.name}" and its ${treeCount} investigation(s)? This cannot be undone.`
      : `Delete project "${project?.name}"? This cannot be undone.`;
    if (!window.confirm(message)) return;

    setProjects(prev => prev.filter(p => p.id !== id));
    setTrees(prev => prev.filter(t => t.projectId !== id));

    if (activeProjectId === id) {
      const remaining = projects.filter(p => p.id !== id);
      setActiveProjectId(remaining[0]?.id ?? null);
      setActiveTreeId(null);
    }
    setSelectedNodeId(null);
  };

  const handleRenameProject = (id: string, newName: string) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p
    ));
  };

  const handleSelectProject = (id: string) => {
    guardedNavigate(() => {
      setActiveProjectId(id);
      // Select first tree in new project, if any
      const projectTreeList = trees.filter(t => t.projectId === id);
      setActiveTreeId(projectTreeList[0]?.id ?? null);
      setSelectedNodeId(null);
      setCurrentView('tree');
    });
  };

  const handleExportProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      exportProjectAsJson(project, trees);
      setLastExportTimestamp();
      setLastExportTs(new Date().toISOString());
      setHasUnsavedChanges(false);
    }
  };

  const handleImportProject = async (file: File) => {
    try {
      const result = await parseProjectImportFile(file);

      if ('type' in result && result.type === 'rcca-project') {
        // It's a project import
        const importData = result as ProjectImportData;
        const newProjectId = crypto.randomUUID();

        // Check for project name conflict
        const existingProject = projects.find(
          p => p.name.trim().toLowerCase() === importData.project.name.trim().toLowerCase()
        );

        let projectName = importData.project.name;
        if (existingProject) {
          projectName = `${importData.project.name} (Imported)`;
        }

        const newProject: Project = {
          ...importData.project,
          id: newProjectId,
          name: projectName,
          updatedAt: new Date().toISOString(),
        };

        const importedTrees: SavedTreeV2[] = importData.trees.map(t => ({
          ...t,
          id: crypto.randomUUID(),
          projectId: newProjectId,
        }));

        setProjects(prev => [...prev, newProject]);
        setTrees(prev => [...prev, ...importedTrees]);
        setActiveProjectId(newProjectId);
        setActiveTreeId(importedTrees[0]?.id ?? null);
        setSelectedNodeId(null);
      } else {
        // Legacy tree import - add to current project via existing flow
        setImportCandidates(result as SavedTree[]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import file');
    }
  };

  // Compute tree counts per project
  const projectTreeCounts: Record<string, number> = {};
  for (const project of projects) {
    projectTreeCounts[project.id] = trees.filter(t => t.projectId === project.id).length;
  }

  // Tree management handlers
  const handleCreateTree = () => {
    if (!activeProjectId) return;
    const name = prompt('Investigation name:', 'New Investigation');
    if (!name) return;
    const newTree: SavedTreeV2 = {
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      treeData: createInitialTree(name),
      actions: [],
      notes: [],
      resolutions: []
    };
    setTrees(prev => [...prev, newTree]);
    setActiveTreeId(newTree.id);
    setSelectedNodeId(null);
  };

  const handleDeleteTree = (id: string) => {
    const tree = trees.find(t => t.id === id);
    if (!window.confirm(`Delete investigation "${tree?.name}"? This cannot be undone.`)) return;
    const remaining = trees.filter(t => t.id !== id);
    setTrees(remaining);
    if (activeTreeId === id) {
      // Select next tree in same project
      const projectRemaining = remaining.filter(t => t.projectId === activeProjectId);
      setActiveTreeId(projectRemaining[0]?.id ?? null);
    }
    setSelectedNodeId(null);
  };

  const handleRenameTree = (id: string, newName: string) => {
    setTrees(prev => prev.map(t =>
      t.id === id ? { ...t, name: newName, updatedAt: new Date().toISOString() } : t
    ));
  };

  const handleToggleResolved = (id: string) => {
    setTrees(prev => prev.map(t =>
      t.id === id
        ? {
            ...t,
            isResolved: !t.isResolved,
            treeData: {
              ...t.treeData,
              status: !t.isResolved ? IssueStatus.RESOLVED : IssueStatus.INVESTIGATING,
            },
            updatedAt: new Date().toISOString()
          }
        : t
    ));
  };

  const handleFileSelected = async (file: File) => {
    try {
      const parsed = await parseImportFile(file);
      setImportCandidates(parsed);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import file');
    }
  };

  const handleImportConfirm = (selected: SavedTree[], conflictMode: 'append' | 'overwrite') => {
    if (!activeProjectId) return;
    let firstResultId: string | null = null;

    setTrees(prev => {
      const updatedTrees = [...prev];

      for (const importedTree of selected) {
        const normalizedName = importedTree.name.trim().toLowerCase();
        // Only check for conflicts within current project
        const existingIndex = updatedTrees.findIndex(
          t => t.projectId === activeProjectId && t.name.trim().toLowerCase() === normalizedName
        );

        if (existingIndex !== -1 && conflictMode === 'overwrite') {
          const existingId = updatedTrees[existingIndex].id;
          updatedTrees[existingIndex] = {
            ...importedTree,
            id: existingId,
            projectId: activeProjectId,
            updatedAt: new Date().toISOString(),
          } as SavedTreeV2;
          if (!firstResultId) firstResultId = existingId;
        } else {
          const newId = crypto.randomUUID();
          updatedTrees.push({ ...importedTree, id: newId, projectId: activeProjectId } as SavedTreeV2);
          if (!firstResultId) firstResultId = newId;
        }
      }

      return updatedTrees;
    });

    if (firstResultId) {
      setActiveTreeId(firstResultId);
    }
    setSelectedNodeId(null);
    setImportCandidates(null);
  };

  const handleExportTree = (id: string) => {
    const tree = trees.find(t => t.id === id);
    if (tree) {
      exportTreeAsJson(tree);
      setLastExportTimestamp();
      setLastExportTs(new Date().toISOString());
      setHasUnsavedChanges(false);
    }
  };

  const handleExportAll = () => {
    if (projectTrees.length === 0) return;
    exportAllTreesAsJson(projectTrees);
    setLastExportTimestamp();
    setLastExportTs(new Date().toISOString());
    setHasUnsavedChanges(false);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleBackupNow = () => {
    if (trees.length === 0) return;
    exportAllTreesAsJson(trees);
    setLastExportTimestamp();
    setLastExportTs(new Date().toISOString());
    setHasUnsavedChanges(false);
  };

  const handleGenerateReport = (id: string) => {
    const tree = trees.find(t => t.id === id);
    if (tree) openReportInNewTab(generateSingleReport(tree));
  };

  const handleGenerateBulkReport = () => {
    if (projectTrees.length > 0) openReportInNewTab(generateBulkReport(projectTrees));
  };

  const handleDashboardSelectTree = (id: string) => {
    guardedNavigate(() => {
      setActiveTreeId(id);
      setSelectedNodeId(null);
      setCurrentView('tree');
    });
  };

  const handleNavigateToNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setCurrentView('tree');
    setInspectorOpen(true);
  };

  if (!initialized) return null;

  if (projects.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
            <GitBranch size={42} />
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>RCCA Helper</h1>
          <p className="text-lg mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Start a blank project or open a saved RCCA JSON file.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCreateProject}
              className="inline-flex min-w-64 items-center justify-center gap-3 px-8 py-5 rounded-xl text-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <Plus size={28} />
              New Project
            </button>
            <button
              onClick={() => void handleOpenJsonFile()}
              disabled={isOpeningFile}
              className="inline-flex min-w-64 items-center justify-center gap-3 px-8 py-5 rounded-xl text-xl font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-wait transition-colors shadow-lg"
            >
              <FolderOpen size={28} />
              {isOpeningFile ? 'Opening...' : 'Open JSON File'}
            </button>
          </div>
          <input
            ref={startupFileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleStartupFileChange}
          />
          {openError && (
            <p className="mt-5 text-sm font-medium text-red-600">
              {openError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
      {/* Navbar */}
      <div className="h-16 flex items-center px-6 justify-between shadow-sm z-30" style={{ backgroundColor: 'var(--color-surface-primary)', borderBottom: '1px solid var(--color-border-primary)' }}>
        <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <GitBranch size={24} />
            </div>
            <div className="whitespace-nowrap">
                <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>RCCA Helper</h1>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Root Cause Analysis & Action Tracking</p>
            </div>
        </div>

        <div className="flex items-center gap-4">
          {/* View toggles */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border-primary)' }}>
            <button
              onClick={() => setCurrentView('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${currentView === 'tree' ? 'bg-indigo-600 text-white' : ''}`}
              style={currentView !== 'tree' ? { backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' } : undefined}
            >
              <GitBranch size={14} /> Tree
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-indigo-600 text-white' : ''}`}
              style={currentView !== 'dashboard' ? { backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)', borderLeft: '1px solid var(--color-border-primary)' } : { borderLeft: '1px solid var(--color-border-primary)' }}
            >
              <LayoutDashboard size={14} /> Dashboard
            </button>
            <button
              onClick={() => setCurrentView('investigate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${currentView === 'investigate' ? 'bg-indigo-600 text-white' : ''}`}
              style={currentView !== 'investigate' ? { backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)', borderLeft: '1px solid var(--color-border-primary)' } : { borderLeft: '1px solid var(--color-border-primary)' }}
              title="View all investigation actions for current investigation"
            >
              <ClipboardList size={14} /> Investigate
            </button>
            <button
              onClick={() => setCurrentView('resolutions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${currentView === 'resolutions' ? 'bg-indigo-600 text-white' : ''}`}
              style={currentView !== 'resolutions' ? { backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)', borderLeft: '1px solid var(--color-border-primary)' } : { borderLeft: '1px solid var(--color-border-primary)' }}
              title="View all corrective actions for current investigation"
            >
              <Shield size={14} /> Corrective
            </button>
          </div>

          {/* Report button - visible only in tree view */}
          {currentView === 'tree' && activeTreeId && (
            <button
              onClick={() => handleGenerateReport(activeTreeId)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
              title="Generate report for current investigation"
            >
              <FileText size={16} />
              Report
            </button>
          )}

          <button
            onClick={() => void handleSaveProject()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
            disabled={!activeProject || saveStatus === 'saving'}
            title="Save project (Ctrl+S)"
          >
            <Save size={16} />
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : hasUnsavedChanges ? 'Save*' : 'Save'}
          </button>

          {/* Project Selector */}
          <ProjectSelector
            projects={projects}
            activeProjectId={activeProjectId}
            projectTreeCounts={projectTreeCounts}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onExportProject={handleExportProject}
            onImportProject={handleImportProject}
          />

          {/* Tree Manager */}
          <TreeManager
            trees={projectTrees}
            activeTreeId={activeTreeId}
            onSelectTree={(id) => guardedNavigate(() => { setActiveTreeId(id); setSelectedNodeId(null); setCurrentView('tree'); })}
            onCreateTree={handleCreateTree}
            onDeleteTree={handleDeleteTree}
            onRenameTree={handleRenameTree}
            onToggleResolved={handleToggleResolved}
            onFileSelected={handleFileSelected}
            onExportTree={handleExportTree}
            onExportAll={handleExportAll}
            onGenerateReport={handleGenerateReport}
            onGenerateBulkReport={handleGenerateBulkReport}
          />

          {/* Theme toggle */}
          <button
            onClick={() => handleUpdateSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' })}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            title={settings.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg transition-colors relative"
            style={{ color: 'var(--color-text-muted)' }}
            title="Settings"
          >
            <Settings size={18} />
            {hasUnsavedChanges && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

        </div>
      </div>

      {/* Main Content */}
      {currentView === 'dashboard' ? (
        <DashboardView
          trees={projectTrees}
          onSelectTree={handleDashboardSelectTree}
          onGenerateReport={handleGenerateReport}
          onGenerateBulkReport={handleGenerateBulkReport}
        />
      ) : currentView === 'investigate' ? (
        activeTree ? (
          <InvestigationActionsSummary
            actions={actions}
            allNodes={allNodes}
            treeName={activeTree.name}
            onAddAction={handleAddAction}
            onUpdateAction={handleUpdateAction}
            onDeleteAction={handleDeleteAction}
            onNavigateToNode={handleNavigateToNode}
            onGenerateReport={() => handleGenerateReport(activeTree.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
            <p>No investigation selected. Create or import one using the dropdown above.</p>
          </div>
        )
      ) : currentView === 'resolutions' ? (
        activeTree ? (
          <ResolutionsSummary
            resolutions={resolutions}
            allRootCauses={allRootCauses}
            treeName={activeTree.name}
            onAddResolution={handleAddResolution}
            onUpdateResolution={handleUpdateResolution}
            onDeleteResolution={handleDeleteResolution}
            onNavigateToNode={handleNavigateToNode}
            onGenerateReport={() => handleGenerateReport(activeTree.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
            <p>No investigation selected. Create or import one using the dropdown above.</p>
          </div>
        )
      ) : treeData ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left: Visualization */}
          <div className="flex-1 h-full relative">
              <TreeVisualizer
                  data={treeData}
                  selectedId={selectedNodeId}
                  actions={actions}
                  resolutions={resolutions}
                  treeName={activeTree?.name}
                  onSelectNode={(node) => { setSelectedNodeId(node.id); setInspectorOpen(true); }}
                  onAddNode={addChildNode}
              />
          </div>

          {/* Right: Inspector */}
          <InspectorPanel
              selectedNode={getSelectedNode()}
              actions={actions}
              notes={notes}
              resolutions={resolutions}
              allRootCauses={allRootCauses}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={deleteNode}
              onAddAction={handleAddAction}
              onUpdateAction={handleUpdateAction}
              onDeleteAction={handleDeleteAction}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onAddResolution={handleAddResolution}
              onUpdateResolution={handleUpdateResolution}
              onDeleteResolution={handleDeleteResolution}
              isOpen={inspectorOpen}
              onClose={() => setInspectorOpen(false)}
              width={inspectorWidth}
              onWidthChange={setInspectorWidth}
          />

          {/* Floating button to reopen inspector when closed */}
          {!inspectorOpen && (
            <button
              onClick={() => setInspectorOpen(true)}
              className="absolute right-4 top-4 p-3 rounded-lg shadow-lg hover:shadow-xl transition-all z-30 flex items-center gap-2"
              style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
              title="Open inspector panel"
            >
              <PanelRightOpen size={20} />
              <span className="text-sm font-medium">Inspector</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
          <p>No investigation selected. Create or import one using the dropdown above.</p>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          lastExportTimestamp={lastExportTimestamp}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
          onBackupNow={handleBackupNow}
        />
      )}

      {importCandidates && (
        <ImportDialog
          importCandidates={importCandidates}
          existingTrees={trees}
          onConfirm={handleImportConfirm}
          onClose={() => setImportCandidates(null)}
        />
      )}

      {pendingNavigation && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[80]" />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[420px] rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}
          >
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Unsaved Changes</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Save this project before leaving your current work?
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingNavigation(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveWithoutSaving}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                Leave Without Saving
              </button>
              <button
                onClick={() => void handleSaveAndContinue()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
