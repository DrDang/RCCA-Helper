import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { ChevronDown, Plus, Trash2, Pencil, Check, X, Folder, Download, Upload } from 'lucide-react';

interface ProjectSelectorProps {
  projects: Project[];
  activeProjectId: string | null;
  projectTreeCounts: Record<string, number>;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onExportProject: (id: string) => void;
  onImportProject: (file: File) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  activeProjectId,
  projectTreeCounts,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onExportProject,
  onImportProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleStartRename = (project: Project) => {
    setRenamingId(project.id);
    setRenameValue(project.name);
  };

  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameProject(renamingId, renameValue.trim());
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
    onImportProject(file);
    e.target.value = '';
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
        <Folder size={16} />
        <span className="max-w-32 truncate">{activeProject?.name ?? 'No Project'}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand-primary)' }}>
          {projectTreeCounts[activeProjectId ?? ''] ?? 0}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full mt-2 left-0 w-72 rounded-xl shadow-xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Projects</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Project list */}
            <div className="max-h-64 overflow-y-auto">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`px-4 py-2.5 flex items-center gap-2 cursor-pointer border-l-3 transition-colors ${
                    project.id === activeProjectId
                      ? 'border-l-indigo-500'
                      : 'border-l-transparent'
                  }`}
                  style={{
                    backgroundColor: project.id === activeProjectId ? 'var(--color-brand-light)' : undefined,
                  }}
                  onMouseEnter={(e) => { if (project.id !== activeProjectId) e.currentTarget.style.backgroundColor = 'var(--color-surface-tertiary)'; }}
                  onMouseLeave={(e) => { if (project.id !== activeProjectId) e.currentTarget.style.backgroundColor = ''; }}
                  onClick={() => {
                    if (renamingId !== project.id) {
                      onSelectProject(project.id);
                      setIsOpen(false);
                    }
                  }}
                >
                  <Folder size={16} style={{ color: project.id === activeProjectId ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }} />
                  <div className="flex-1 min-w-0">
                    {renamingId === project.id ? (
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
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{project.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-muted)' }}>
                            {projectTreeCounts[project.id] ?? 0}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(project.updatedAt)}</div>
                      </>
                    )}
                  </div>

                  {renamingId !== project.id && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleStartRename(project); }}
                        className="p-1 rounded"
                        style={{ color: 'var(--color-text-muted)' }}
                        title="Rename"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onExportProject(project.id); }}
                        className="p-1 rounded"
                        style={{ color: 'var(--color-text-muted)' }}
                        title="Export project"
                      >
                        <Download size={13} />
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); onDeleteProject(project.id); }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-3 py-2.5 flex gap-2" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
              <button
                onClick={() => { onCreateProject(); setIsOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <Plus size={15} />
                New Project
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
