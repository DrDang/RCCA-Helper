import React, { useState, useRef } from 'react';
import { SavedTree } from '../types';
import { STATUS_COLORS } from '../constants';
import { ChevronDown, Plus, Upload, Download, Trash2, Pencil, Check, X, Package, FileText, FileStack, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';

interface TreeManagerProps {
  trees: SavedTree[];
  activeTreeId: string | null;
  onSelectTree: (id: string) => void;
  onCreateTree: () => void;
  onDeleteTree: (id: string) => void;
  onRenameTree: (id: string, newName: string) => void;
  onToggleResolved: (id: string) => void;
  onFileSelected: (file: File) => void;
  onExportTree: (id: string) => void;
  onExportAll: () => void;
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
  onToggleResolved,
  onFileSelected,
  onExportTree,
  onExportAll,
  onGenerateReport,
  onGenerateBulkReport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [hideResolved, setHideResolved] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
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
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {trees.filter(t => !t.isResolved).length} active
                  {trees.filter(t => t.isResolved).length > 0 && `, ${trees.filter(t => t.isResolved).length} resolved`}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setHideResolved(!hideResolved); }}
                  className="p-1 rounded transition-colors"
                  style={{ color: hideResolved ? 'var(--color-text-muted)' : 'var(--color-brand-primary)' }}
                  title={hideResolved ? 'Show resolved investigations' : 'Hide resolved investigations'}
                >
                  {hideResolved ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Tree list */}
            <div className="max-h-64 overflow-y-auto">
              {trees.filter(t => !hideResolved || !t.isResolved).map(tree => (
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate" style={{ color: tree.isResolved ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{tree.name}</span>
                          {tree.isResolved && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Resolved
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(tree.updatedAt)}</div>
                      </>
                    )}
                  </div>

                  {renamingId !== tree.id && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); onToggleResolved(tree.id); }}
                        className={`p-1 rounded transition-colors ${tree.isResolved ? 'text-green-600 hover:text-green-700' : 'text-slate-400 hover:text-green-600'}`}
                        title={tree.isResolved ? 'Mark as active' : 'Mark as resolved'}
                      >
                        {tree.isResolved ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                      </button>
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
              onChange={handleFileChange}
            />
          </div>
        </>
      )}
    </div>
  );
};
