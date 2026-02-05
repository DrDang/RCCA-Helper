import React, { useState, useRef } from 'react';
import { SavedTree, NodeStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { importTreeFromJson, importAllTreesFromJson } from '../persistence';
import { ChevronDown, Plus, Upload, Download, Trash2, Pencil, Check, X, PackageOpen, Package, FileText, FileStack } from 'lucide-react';

interface TreeManagerProps {
  trees: SavedTree[];
  activeTreeId: string | null;
  onSelectTree: (id: string) => void;
  onCreateTree: () => void;
  onDeleteTree: (id: string) => void;
  onRenameTree: (id: string, newName: string) => void;
  onImportTree: (tree: SavedTree) => void;
  onExportTree: (id: string) => void;
  onExportAll: () => void;
  onImportAll: (trees: SavedTree[]) => void;
  onGenerateReport: (id: string) => void;
  onGenerateBulkReport: () => void;
}

export const TreeManager: React.FC<TreeManagerProps> = ({
  trees,
  activeTreeId,
  onSelectTree,
  onCreateTree,
  onDeleteTree,
  onRenameTree,
  onImportTree,
  onExportTree,
  onExportAll,
  onImportAll,
  onGenerateReport,
  onGenerateBulkReport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkImportRef = useRef<HTMLInputElement>(null);

  const activeTree = trees.find(t => t.id === activeTreeId);

  const handleStartRename = (tree: SavedTree) => {
    setRenamingId(tree.id);
    setRenameValue(tree.name);
  };

  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameTree(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const trees = await importAllTreesFromJson(file);
      onImportAll(trees);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import file');
    }
    e.target.value = '';
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const tree = await importTreeFromJson(file);
      onImportTree(tree);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import file');
    }
    // Reset input so the same file can be re-imported
    e.target.value = '';
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
      >
        <span className="max-w-48 truncate">{activeTree?.name ?? 'No Investigation'}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full mt-2 right-0 w-80 rounded-xl shadow-xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Investigations</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{trees.length} total</span>
            </div>

            {/* Tree list */}
            <div className="max-h-64 overflow-y-auto">
              {trees.map(tree => (
                <div
                  key={tree.id}
                  className={`px-4 py-2.5 flex items-center gap-2 cursor-pointer border-l-3 transition-colors ${
                    tree.id === activeTreeId
                      ? 'border-l-indigo-500'
                      : 'border-l-transparent'
                  }`}
                  style={{
                    backgroundColor: tree.id === activeTreeId ? 'var(--color-brand-light)' : undefined,
                  }}
                  onMouseEnter={(e) => { if (tree.id !== activeTreeId) e.currentTarget.style.backgroundColor = 'var(--color-surface-tertiary)'; }}
                  onMouseLeave={(e) => { if (tree.id !== activeTreeId) e.currentTarget.style.backgroundColor = ''; }}
                  onClick={() => {
                    if (renamingId !== tree.id) {
                      onSelectTree(tree.id);
                      setIsOpen(false);
                    }
                  }}
                >
                  {/* Root node status indicator */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[tree.treeData.status].border }}
                    title={tree.treeData.status.replace('_', ' ')}
                  />
                  <div className="flex-1 min-w-0">
                    {renamingId === tree.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                          className="text-sm px-1.5 py-0.5 border border-indigo-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); handleConfirmRename(); }}
                          className="p-0.5 text-green-600 rounded"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleCancelRename(); }}
                          className="p-0.5 rounded"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{tree.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(tree.updatedAt)}</div>
                      </>
                    )}
                  </div>

                  {renamingId !== tree.id && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleStartRename(tree); }}
                        className="p-1 rounded"
                        style={{ color: 'var(--color-text-muted)' }}
                        title="Rename"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onGenerateReport(tree.id); }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title="Report"
                      >
                        <FileText size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onExportTree(tree.id); }}
                        className="p-1 rounded"
                        style={{ color: 'var(--color-text-muted)' }}
                        title="Export"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteTree(tree.id); }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-3 py-2.5 flex gap-2" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
              <button
                onClick={() => { onCreateTree(); setIsOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <Plus size={15} />
                New
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                <Upload size={15} />
                Import
              </button>
            </div>

            {/* Bulk actions */}
            <div className="px-3 py-2.5 flex gap-2" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
              <button
                onClick={() => { onExportAll(); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                <Package size={15} />
                Export All
              </button>
              <button
                onClick={() => bulkImportRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                <PackageOpen size={15} />
                Import All
              </button>
            </div>

            {/* Report actions */}
            <div className="px-3 py-2.5 flex gap-2" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
              <button
                onClick={() => { onGenerateBulkReport(); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <FileStack size={15} />
                Report All
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <input
              ref={bulkImportRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleBulkImport}
            />
          </div>
        </>
      )}
    </div>
  );
};
