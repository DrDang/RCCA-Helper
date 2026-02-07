import React, { useState, useMemo } from 'react';
import { SavedTree } from '../types';
import { X, Upload, AlertTriangle } from 'lucide-react';

interface ImportDialogProps {
  importCandidates: SavedTree[];
  existingTrees: SavedTree[];
  onConfirm: (selected: SavedTree[], conflictMode: 'append' | 'overwrite') => void;
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  importCandidates,
  existingTrees,
  onConfirm,
  onClose,
}) => {
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const tree of importCandidates) {
      map[tree.id] = true;
    }
    return map;
  });
  const [conflictMode, setConflictMode] = useState<'append' | 'overwrite'>('append');

  const conflicts = useMemo(() => {
    const map: Record<string, SavedTree> = {};
    for (const candidate of importCandidates) {
      const normalizedName = candidate.name.trim().toLowerCase();
      const match = existingTrees.find(
        t => t.name.trim().toLowerCase() === normalizedName
      );
      if (match) {
        map[candidate.id] = match;
      }
    }
    return map;
  }, [importCandidates, existingTrees]);

  const hasAnyConflicts = Object.keys(conflicts).length > 0;
  const selectedCount = Object.values(checkedMap).filter(Boolean).length;
  const allChecked = selectedCount === importCandidates.length;

  const toggleAll = () => {
    const newValue = !allChecked;
    const map: Record<string, boolean> = {};
    for (const tree of importCandidates) {
      map[tree.id] = newValue;
    }
    setCheckedMap(map);
  };

  const toggleOne = (id: string) => {
    setCheckedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirm = () => {
    const selected = importCandidates.filter(t => checkedMap[t.id]);
    onConfirm(selected, conflictMode);
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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[540px] max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          border: '1px solid var(--color-border-primary)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-primary)' }}
        >
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-indigo-600" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Import Investigations</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Found {importCandidates.length} investigation{importCandidates.length !== 1 ? 's' : ''} in file.
          </p>

          {/* Conflict resolution mode */}
          {hasAnyConflicts && (
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
            >
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                When names match existing investigations:
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="conflictMode"
                    value="append"
                    checked={conflictMode === 'append'}
                    onChange={() => setConflictMode('append')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Append as copy</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="conflictMode"
                    value="overwrite"
                    checked={conflictMode === 'overwrite'}
                    onChange={() => setConflictMode('overwrite')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Overwrite existing</span>
                </label>
              </div>
            </div>
          )}

          {/* Select all */}
          <label className="flex items-center gap-2 cursor-pointer pb-1" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Select All
            </span>
          </label>

          {/* Investigation list */}
          <div className="space-y-1">
            {importCandidates.map(tree => {
              const conflict = conflicts[tree.id];
              return (
                <label
                  key={tree.id}
                  className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{ backgroundColor: checkedMap[tree.id] ? 'var(--color-brand-light)' : undefined }}
                  onMouseEnter={(e) => { if (!checkedMap[tree.id]) e.currentTarget.style.backgroundColor = 'var(--color-surface-tertiary)'; }}
                  onMouseLeave={(e) => { if (!checkedMap[tree.id]) e.currentTarget.style.backgroundColor = ''; }}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedMap[tree.id]}
                    onChange={() => toggleOne(tree.id)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {tree.name}
                      </span>
                      {conflict && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
                          style={{ backgroundColor: 'var(--color-status-active-bg)', color: 'var(--color-status-active-text)' }}
                        >
                          <AlertTriangle size={11} />
                          Matches existing
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      Created: {formatDate(tree.createdAt)} &middot; Updated: {formatDate(tree.updatedAt)}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border-primary)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              selectedCount === 0 ? 'opacity-50 cursor-not-allowed bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Import {selectedCount} Selected
          </button>
        </div>
      </div>
    </>
  );
};
