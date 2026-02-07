import React, { useState } from 'react';
import { CauseNode, ResolutionItem, ResolutionStatus } from '../types';
import { RESOLUTION_STATUS_COLORS } from '../constants';
import {
    Shield,
    Plus,
    Calendar,
    User,
    Link2,
    XCircle,
    ChevronDown,
    ChevronUp,
    Filter,
    AlertTriangle,
    FileText,
    ExternalLink
} from 'lucide-react';

const RESOLUTION_STATUSES: ResolutionStatus[] = [
  'Draft', 'Approved', 'In Progress', 'Implemented', 'Verified', 'Closed'
];

const RESOLUTION_STATUS_ORDER: Record<string, number> = {
  'In Progress': 0,
  'Approved': 1,
  'Draft': 2,
  'Implemented': 3,
  'Verified': 4,
  'Closed': 5,
};

interface ResolutionsSummaryProps {
  resolutions: ResolutionItem[];
  allRootCauses: CauseNode[];
  treeName: string;
  onAddResolution: (resolution: ResolutionItem) => void;
  onUpdateResolution: (resolution: ResolutionItem) => void;
  onDeleteResolution: (resolutionId: string) => void;
  onNavigateToNode: (nodeId: string) => void;
  onGenerateReport: () => void;
}

export const ResolutionsSummary: React.FC<ResolutionsSummaryProps> = ({
  resolutions,
  allRootCauses,
  treeName,
  onAddResolution,
  onUpdateResolution,
  onDeleteResolution,
  onNavigateToNode,
  onGenerateReport
}) => {
  const [statusFilter, setStatusFilter] = useState<ResolutionStatus | 'all'>('all');
  const [expandedResolutionId, setExpandedResolutionId] = useState<string | null>(null);

  // Filter and sort resolutions
  const filteredResolutions = resolutions
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .sort((a, b) => (RESOLUTION_STATUS_ORDER[a.status] ?? 99) - (RESOLUTION_STATUS_ORDER[b.status] ?? 99));

  // Calculate stats
  const statusCounts = RESOLUTION_STATUSES.reduce((acc, status) => {
    acc[status] = resolutions.filter(r => r.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  const overdueCount = resolutions.filter(r => {
    if (!r.targetDate || r.status === 'Verified' || r.status === 'Closed') return false;
    return new Date(r.targetDate) < new Date();
  }).length;

  const rootCausesWithResolutions = new Set(resolutions.flatMap(r => r.linkedCauseIds));
  const rootCausesWithoutResolutions = allRootCauses.filter(rc => !rootCausesWithResolutions.has(rc.id));

  const createNewResolution = (): ResolutionItem => ({
    id: crypto.randomUUID(),
    linkedCauseIds: allRootCauses.length > 0 ? [allRootCauses[0].id] : [],
    title: 'New Resolution',
    description: '',
    owner: 'Unassigned',
    targetDate: '',
    implementedDate: '',
    verificationMethod: '',
    verificationResults: '',
    verifiedDate: '',
    status: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const getRootCauseLabel = (id: string) => {
    const rc = allRootCauses.find(c => c.id === id);
    return rc?.label ?? 'Unknown';
  };

  const renderResolutionCard = (resolution: ResolutionItem) => {
    const colors = RESOLUTION_STATUS_COLORS[resolution.status] ?? RESOLUTION_STATUS_COLORS['Draft'];
    const isExpanded = expandedResolutionId === resolution.id;
    const isOverdue = resolution.targetDate &&
                      new Date(resolution.targetDate) < new Date() &&
                      resolution.status !== 'Verified' &&
                      resolution.status !== 'Closed';

    return (
      <div
        key={resolution.id}
        className="p-4 rounded-lg border shadow-sm"
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <input
              className="font-semibold text-base w-full bg-transparent outline-none"
              style={{ color: colors.text }}
              value={resolution.title}
              onChange={(e) => onUpdateResolution({...resolution, title: e.target.value})}
              placeholder="Resolution title..."
            />
            {isOverdue && (
              <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertTriangle size={12} />
                <span>Overdue</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={resolution.status}
              onChange={(e) => onUpdateResolution({...resolution, status: e.target.value as ResolutionStatus})}
              className="text-xs border rounded px-2 py-1"
              style={{ borderColor: colors.border, color: colors.text, backgroundColor: 'var(--color-surface-primary)' }}
            >
              {RESOLUTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => setExpandedResolutionId(isExpanded ? null : resolution.id)}
              className="p-1.5 rounded hover:bg-black/10"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={() => onDeleteResolution(resolution.id)}
              className="p-1.5 rounded hover:text-red-400"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>

        {/* Summary row */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
            <User size={14} />
            <input
              className="bg-transparent outline-none"
              style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)' }}
              value={resolution.owner}
              onChange={(e) => onUpdateResolution({...resolution, owner: e.target.value})}
              placeholder="Owner"
            />
          </div>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
            <Calendar size={14} />
            <input
              type="date"
              className="bg-transparent outline-none"
              style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)' }}
              value={resolution.targetDate}
              onChange={(e) => onUpdateResolution({...resolution, targetDate: e.target.value})}
            />
          </div>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
            <Link2 size={14} />
            <span>{resolution.linkedCauseIds.length} root cause{resolution.linkedCauseIds.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Linked root causes preview */}
        <div className="mt-2 flex flex-wrap gap-1">
          {resolution.linkedCauseIds.map(id => (
            <button
              key={id}
              onClick={() => onNavigateToNode(id)}
              className="text-xs px-2 py-0.5 rounded flex items-center gap-1 hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
              title="Click to view in tree"
            >
              {getRootCauseLabel(id)}
              <ExternalLink size={10} />
            </button>
          ))}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
            <div>
              <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Description</label>
              <textarea
                className="w-full text-sm p-2 rounded resize-none mt-1"
                style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                rows={3}
                value={resolution.description}
                onChange={(e) => onUpdateResolution({...resolution, description: e.target.value})}
                placeholder="Describe the corrective action..."
              />
            </div>

            <div>
              <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Verification Method</label>
              <textarea
                className="w-full text-sm p-2 rounded resize-none mt-1"
                style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                rows={2}
                value={resolution.verificationMethod}
                onChange={(e) => onUpdateResolution({...resolution, verificationMethod: e.target.value})}
                placeholder="How will effectiveness be verified?"
              />
            </div>

            {(resolution.status === 'Implemented' || resolution.status === 'Verified' || resolution.status === 'Closed') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Implemented Date</label>
                    <input
                      type="date"
                      className="w-full text-sm p-2 rounded mt-1"
                      style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                      value={resolution.implementedDate}
                      onChange={(e) => onUpdateResolution({...resolution, implementedDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Verified Date</label>
                    <input
                      type="date"
                      className="w-full text-sm p-2 rounded mt-1"
                      style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                      value={resolution.verifiedDate}
                      onChange={(e) => onUpdateResolution({...resolution, verifiedDate: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Verification Results</label>
                  <textarea
                    className="w-full text-sm p-2 rounded resize-none mt-1"
                    style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                    rows={2}
                    value={resolution.verificationResults}
                    onChange={(e) => onUpdateResolution({...resolution, verificationResults: e.target.value})}
                    placeholder="Document verification results..."
                  />
                </div>
              </>
            )}

            {/* Link to root causes */}
            {allRootCauses.length > 0 && (
              <div>
                <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Link to Root Causes</label>
                <div className="mt-2 space-y-1">
                  {allRootCauses.map(rc => (
                    <label key={rc.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resolution.linkedCauseIds.includes(rc.id)}
                        onChange={(e) => {
                          const newLinked = e.target.checked
                            ? [...resolution.linkedCauseIds, rc.id]
                            : resolution.linkedCauseIds.filter(id => id !== rc.id);
                          if (newLinked.length > 0) {
                            onUpdateResolution({...resolution, linkedCauseIds: newLinked});
                          }
                        }}
                        className="rounded"
                        disabled={resolution.linkedCauseIds.length === 1 && resolution.linkedCauseIds[0] === rc.id}
                      />
                      <span style={{ color: 'var(--color-text-secondary)' }}>{rc.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Shield size={24} /> Corrective Actions
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {treeName} — Actions to fix confirmed root causes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateReport}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
              title="Generate report for current investigation"
            >
              <FileText size={16} /> Report
            </button>
            <button
              onClick={() => onAddResolution(createNewResolution())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              disabled={allRootCauses.length === 0}
              title={allRootCauses.length === 0 ? 'Confirm at least one root cause first' : 'Add new corrective action'}
            >
              <Plus size={16} /> Add Action
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{resolutions.length}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Actions</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: statusCounts['In Progress'] > 0 ? 'var(--color-resolution-progress-text)' : 'var(--color-text-primary)' }}>
              {statusCounts['In Progress'] + statusCounts['Approved'] + statusCounts['Draft']}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Active</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: statusCounts['Verified'] > 0 ? 'var(--color-resolution-verified-text)' : 'var(--color-text-primary)' }}>
              {statusCounts['Verified'] + statusCounts['Closed']}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Completed</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: overdueCount > 0 ? '#fef2f2' : 'var(--color-surface-primary)', border: overdueCount > 0 ? '1px solid #ef4444' : '1px solid var(--color-border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: overdueCount > 0 ? '#991b1b' : 'var(--color-text-primary)' }}>{overdueCount}</div>
            <div className="text-xs" style={{ color: overdueCount > 0 ? '#991b1b' : 'var(--color-text-muted)' }}>Overdue</div>
          </div>
        </div>

        {/* Unaddressed root causes warning */}
        {rootCausesWithoutResolutions.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border-2 border-amber-300 bg-amber-50">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
              <AlertTriangle size={16} />
              Root Causes Without Corrective Actions
            </div>
            <ul className="text-sm text-amber-700 space-y-1">
              {rootCausesWithoutResolutions.map(rc => (
                <li key={rc.id} className="flex items-center gap-1">
                  <span>•</span>
                  <button
                    onClick={() => onNavigateToNode(rc.id)}
                    className="hover:underline flex items-center gap-1"
                    title="Click to view in tree"
                  >
                    {rc.label}
                    <ExternalLink size={10} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ResolutionStatus | 'all')}
            className="text-sm rounded px-2 py-1"
            style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)' }}
          >
            <option value="all">All Statuses ({resolutions.length})</option>
            {RESOLUTION_STATUSES.map(s => (
              <option key={s} value={s}>{s} ({statusCounts[s]})</option>
            ))}
          </select>
        </div>

        {/* Resolution cards */}
        {allRootCauses.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <Shield size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Root Causes Confirmed</p>
            <p className="text-sm mt-1">Confirm at least one root cause in the fault tree to start tracking resolutions.</p>
          </div>
        ) : filteredResolutions.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <Shield size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {statusFilter === 'all' ? 'No Resolutions Yet' : `No ${statusFilter} Resolutions`}
            </p>
            <p className="text-sm mt-1">
              {statusFilter === 'all'
                ? 'Add resolutions to track corrective actions for confirmed root causes.'
                : 'No resolutions match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResolutions.map(renderResolutionCard)}
          </div>
        )}
      </div>
    </div>
  );
};
