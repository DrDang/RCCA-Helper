import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TreeVisualizer } from './components/TreeVisualizer';
import { InspectorPanel } from './components/InspectorPanel';
import { TreeManager } from './components/TreeManager';
import { DashboardView } from './components/DashboardView';
import { ResolutionsSummary } from './components/ResolutionsSummary';
import { InvestigationActionsSummary } from './components/InvestigationActionsSummary';
import { CauseNode, ActionItem, Note, NodeStatus, NodeType, SavedTree, AppSettings, ResolutionItem } from './types';
import { createInitialTree } from './constants';
import { loadAppState, saveAppState, exportTreeAsJson, exportAllTreesAsJson, parseImportFile, loadSettings, saveSettings, getLastExportTimestamp, setLastExportTimestamp, DEFAULT_SETTINGS } from './persistence';
import { generateSingleReport, generateBulkReport, openReportInNewTab } from './reportGenerator';
import { SettingsModal } from './components/SettingsModal';
import { ImportDialog } from './components/ImportDialog';
import { GitBranch, LayoutDashboard, FileText, Settings, Moon, Sun, Shield, ClipboardList, PanelRightOpen } from 'lucide-react';

const App: React.FC = () => {
  const [trees, setTrees] = useState<SavedTree[]>([]);
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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadAppState();
    if (saved && saved.trees.length > 0) {
      setTrees(saved.trees);
      setActiveTreeId(saved.activeTreeId ?? saved.trees[0].id);
    } else {
      const defaultTree: SavedTree = {
        id: crypto.randomUUID(),
        name: 'New Investigation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        treeData: createInitialTree(),
        actions: [],
        notes: [],
        resolutions: []
      };
      setTrees([defaultTree]);
      setActiveTreeId(defaultTree.id);
    }
    const savedSettings = loadSettings();
    setSettings(savedSettings);
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
    setHasUnsavedChanges(true);
  }, [trees]);

  // Auto-backup interval
  useEffect(() => {
    if (!settings.autoBackupEnabled || !initialized || trees.length === 0) return;
    const intervalMs = settings.autoBackupIntervalMinutes * 60 * 1000;
    const timer = setInterval(() => {
      if (hasUnsavedChanges) {
        const prefix = settings.projectFileName || 'RCCA_Backup';
        const blob = new Blob([JSON.stringify(trees, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefix.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setLastExportTimestamp();
        setLastExportTs(new Date().toISOString());
        setHasUnsavedChanges(false);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [settings.autoBackupEnabled, settings.autoBackupIntervalMinutes, settings.projectFileName, initialized, trees, hasUnsavedChanges]);

  // Note: No beforeunload warning needed since data is auto-saved to localStorage.
  // Users can export to JSON files for sharing or backup purposes.

  // Debounced auto-save to localStorage
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialized || trees.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveAppState({ activeTreeId, trees });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [trees, activeTreeId, initialized]);

  // Derive active tree data
  const activeTree = trees.find(t => t.id === activeTreeId) ?? null;
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
  const allRootCauses = allNodes.filter(n => n.isRootCause === true);

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
    updateActiveTree(tree => ({
      ...tree,
      treeData: updateTree(tree.treeData, updatedNode)
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

  // Tree management handlers
  const handleCreateTree = () => {
    const name = prompt('Investigation name:', 'New Investigation');
    if (!name) return;
    const newTree: SavedTree = {
      id: crypto.randomUUID(),
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
    if (trees.length <= 1) {
      alert('Cannot delete the last investigation. Create another one first.');
      return;
    }
    const tree = trees.find(t => t.id === id);
    if (!window.confirm(`Delete investigation "${tree?.name}"? This cannot be undone.`)) return;
    const remaining = trees.filter(t => t.id !== id);
    setTrees(remaining);
    if (activeTreeId === id) {
      setActiveTreeId(remaining[0]?.id ?? null);
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
      t.id === id ? { ...t, isResolved: !t.isResolved, updatedAt: new Date().toISOString() } : t
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
    let firstResultId: string | null = null;

    setTrees(prev => {
      const updatedTrees = [...prev];

      for (const importedTree of selected) {
        const normalizedName = importedTree.name.trim().toLowerCase();
        const existingIndex = updatedTrees.findIndex(
          t => t.name.trim().toLowerCase() === normalizedName
        );

        if (existingIndex !== -1 && conflictMode === 'overwrite') {
          const existingId = updatedTrees[existingIndex].id;
          updatedTrees[existingIndex] = {
            ...importedTree,
            id: existingId,
            updatedAt: new Date().toISOString(),
          };
          if (!firstResultId) firstResultId = existingId;
        } else {
          const newId = crypto.randomUUID();
          updatedTrees.push({ ...importedTree, id: newId });
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
    if (trees.length === 0) return;
    exportAllTreesAsJson(trees);
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
    if (trees.length > 0) openReportInNewTab(generateBulkReport(trees));
  };

  const handleDashboardSelectTree = (id: string) => {
    setActiveTreeId(id);
    setSelectedNodeId(null);
    setCurrentView('tree');
  };

  const handleNavigateToNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setCurrentView('tree');
    setInspectorOpen(true);
  };

  if (!initialized) return null;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
      {/* Navbar */}
      <div className="h-16 flex items-center px-6 justify-between shadow-sm z-30" style={{ backgroundColor: 'var(--color-surface-primary)', borderBottom: '1px solid var(--color-border-primary)' }}>
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <GitBranch size={24} />
            </div>
            <div>
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

          {/* Tree Manager */}
          <TreeManager
            trees={trees}
            activeTreeId={activeTreeId}
            onSelectTree={(id) => { setActiveTreeId(id); setSelectedNodeId(null); setCurrentView('tree'); }}
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

          {/* Status legend */}
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-status-pending-bg)', border: '1px solid var(--color-status-pending-border)' }}></span> Pending
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-status-active-bg)', border: '1px solid var(--color-status-active-border)' }}></span> Active
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-status-ruled-out-bg)', border: '1px solid var(--color-status-ruled-out-border)' }}></span> Ruled Out
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-status-confirmed-bg)', border: '1px solid var(--color-status-confirmed-border)' }}></span> Confirmed
          </div>
        </div>
      </div>

      {/* Main Content */}
      {currentView === 'dashboard' ? (
        <DashboardView
          trees={trees}
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
    </div>
  );
};

export default App;
