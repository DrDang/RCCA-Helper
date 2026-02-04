import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TreeVisualizer } from './components/TreeVisualizer';
import { InspectorPanel } from './components/InspectorPanel';
import { TreeManager } from './components/TreeManager';
import { CauseNode, ActionItem, Note, NodeStatus, NodeType, SavedTree } from './types';
import { createInitialTree } from './constants';
import { loadAppState, saveAppState, exportTreeAsJson } from './persistence';
import { GitBranch } from 'lucide-react';

const App: React.FC = () => {
  const [trees, setTrees] = useState<SavedTree[]>([]);
  const [activeTreeId, setActiveTreeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

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
        notes: []
      };
      setTrees([defaultTree]);
      setActiveTreeId(defaultTree.id);
    }
    setInitialized(true);
  }, []);

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
      notes: []
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

  const handleImportTree = (imported: SavedTree) => {
    const newTree = { ...imported, id: crypto.randomUUID() };
    setTrees(prev => [...prev, newTree]);
    setActiveTreeId(newTree.id);
    setSelectedNodeId(null);
  };

  const handleExportTree = (id: string) => {
    const tree = trees.find(t => t.id === id);
    if (tree) exportTreeAsJson(tree);
  };

  if (!initialized) return null;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Navbar */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <GitBranch size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">RCCA Helper</h1>
                <p className="text-xs text-slate-500">Root Cause Analysis & Action Tracking</p>
            </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Tree Manager */}
          <TreeManager
            trees={trees}
            activeTreeId={activeTreeId}
            onSelectTree={(id) => { setActiveTreeId(id); setSelectedNodeId(null); }}
            onCreateTree={handleCreateTree}
            onDeleteTree={handleDeleteTree}
            onRenameTree={handleRenameTree}
            onImportTree={handleImportTree}
            onExportTree={handleExportTree}
          />

          {/* Status legend */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></span> Pending
            <span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-500"></span> Active
            <span className="w-3 h-3 rounded-full bg-green-100 border border-green-500"></span> Ruled Out
            <span className="w-3 h-3 rounded-full bg-red-100 border border-red-500"></span> Confirmed
          </div>
        </div>
      </div>

      {/* Main Content */}
      {treeData ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left: Visualization */}
          <div className="flex-1 h-full relative">
              <TreeVisualizer
                  data={treeData}
                  selectedId={selectedNodeId}
                  actions={actions}
                  onSelectNode={(node) => setSelectedNodeId(node.id)}
                  onAddNode={addChildNode}
              />
          </div>

          {/* Right: Inspector */}
          <InspectorPanel
              selectedNode={getSelectedNode()}
              actions={actions}
              notes={notes}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={deleteNode}
              onAddAction={handleAddAction}
              onUpdateAction={handleUpdateAction}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <p>No investigation selected. Create or import one using the dropdown above.</p>
        </div>
      )}
    </div>
  );
};

export default App;
