import React, { useState } from 'react';
import { ActionItem, ActionUpdate, CauseNode } from '../types';
import {
    ClipboardList,
    Plus,
    Calendar,
    User,
    XCircle,
    ChevronDown,
    ChevronUp,
    Filter,
    AlertTriangle,
    FileText,
    ExternalLink,
    MessageSquarePlus,
    ChevronRight
} from 'lucide-react';

const ACTION_STATUSES: ActionItem['status'][] = [
  'Open', 'In Progress', 'Complete', 'Blocked', 'Closed'
];

const ACTION_STATUS_ORDER: Record<string, number> = {
  'Blocked': 0,
  'In Progress': 1,
  'Open': 2,
  'Complete': 3,
  'Closed': 4,
};

const ACTION_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Open': { bg: 'var(--color-action-open-bg)', border: 'var(--color-action-open-border)', text: 'var(--color-action-open-text)' },
  'In Progress': { bg: 'var(--color-action-progress-bg)', border: 'var(--color-action-progress-border)', text: 'var(--color-action-progress-text)' },
  'Complete': { bg: 'var(--color-action-complete-bg)', border: 'var(--color-action-complete-border)', text: 'var(--color-action-complete-text)' },
  'Blocked': { bg: 'var(--color-action-blocked-bg)', border: 'var(--color-action-blocked-border)', text: 'var(--color-action-blocked-text)' },
  'Closed': { bg: 'var(--color-action-closed-bg)', border: 'var(--color-action-closed-border)', text: 'var(--color-action-closed-text)' },
};

interface InvestigationActionsSummaryProps {
  actions: ActionItem[];
  allNodes: CauseNode[];
  treeName: string;
  onAddAction: (action: ActionItem) => void;
  onUpdateAction: (action: ActionItem) => void;
  onDeleteAction: (actionId: string) => void;
  onNavigateToNode: (nodeId: string) => void;
  onGenerateReport: () => void;
}

export const InvestigationActionsSummary: React.FC<InvestigationActionsSummaryProps> = ({
  actions,
  allNodes,
  treeName,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onNavigateToNode,
  onGenerateReport
}) => {
  const [statusFilter, setStatusFilter] = useState<ActionItem['status'] | 'all'>('all');
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [expandedActionUpdates, setExpandedActionUpdates] = useState<Record<string, boolean>>({});
  const [newUpdateText, setNewUpdateText] = useState<Record<string, string>>({});

  const filteredActions = actions
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .sort((a, b) => (ACTION_STATUS_ORDER[a.status] ?? 99) - (ACTION_STATUS_ORDER[b.status] ?? 99));

  const statusCounts = ACTION_STATUSES.reduce((acc, status) => {
    acc[status] = actions.filter(a => a.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  const overdueCount = actions.filter(a => {
    if (!a.dueDate || a.status === 'Complete' || a.status === 'Closed') return false;
    return new Date(a.dueDate) < new Date();
  }).length;

  const getNodeLabel = (causeId: string) => {
    const node = allNodes.find(n => n.id === causeId);
    return node?.label ?? 'Unknown';
  };

  const renderActionCard = (action: ActionItem) => {
    const colors = ACTION_STATUS_COLORS[action.status] ?? ACTION_STATUS_COLORS['Open'];
    const isExpanded = expandedActionId === action.id;
    const isOverdue = action.dueDate &&
                      new Date(action.dueDate) < new Date() &&
                      action.status !== 'Complete' &&
                      action.status !== 'Closed';

    return (
      <div
        key={action.id}
        className="p-4 rounded-lg border shadow-sm"
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <input
              className="font-semibold text-base w-full bg-transparent outline-none"
              style={{ color: colors.text }}
              value={action.action}
              onChange={(e) => onUpdateAction({...action, action: e.target.value})}
              placeholder="Action title..."
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
              value={action.status}
              onChange={(e) => onUpdateAction({...action, status: e.target.value as ActionItem['status']})}
              className="text-xs border rounded px-2 py-1"
              style={{ borderColor: colors.border, color: colors.text, backgroundColor: 'var(--color-surface-primary)' }}
            >
              {ACTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
              className="p-1.5 rounded hover:bg-black/10"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete action "${action.action}"? This cannot be undone.`)) {
                  onDeleteAction(action.id);
                }
              }}
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
              value={action.assignee}
              onChange={(e) => onUpdateAction({...action, assignee: e.target.value})}
              placeholder="Assignee"
            />
          </div>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
            <Calendar size={14} />
            <input
              type="date"
              className="bg-transparent outline-none"
              style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)' }}
              value={action.dueDate}
              onChange={(e) => onUpdateAction({...action, dueDate: e.target.value})}
            />
          </div>
        </div>

        {/* Linked cause */}
        <div className="mt-2">
          <button
            onClick={() => onNavigateToNode(action.causeId)}
            className="text-xs px-2 py-0.5 rounded flex items-center gap-1 hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' }}
            title="Click to view in tree"
          >
            {getNodeLabel(action.causeId)}
            <ExternalLink size={10} />
          </button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
            <div>
              <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Rationale</label>
              <textarea
                className="w-full text-sm p-2 rounded resize-none mt-1"
                style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                rows={3}
                value={action.rationale}
                onChange={(e) => onUpdateAction({...action, rationale: e.target.value})}
                placeholder="Why is this action needed?"
              />
            </div>

            {/* Updates / Activity Log */}
            <div className="pt-3" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
              <button
                onClick={() => setExpandedActionUpdates(prev => ({ ...prev, [action.id]: !prev[action.id] }))}
                className="flex items-center gap-1 text-xs uppercase tracking-wider font-semibold w-full"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <ChevronRight
                  size={14}
                  className={`transition-transform ${expandedActionUpdates[action.id] ? 'rotate-90' : ''}`}
                />
                Updates ({(action.updates ?? []).length})
              </button>

              {expandedActionUpdates[action.id] && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add update..."
                      className="flex-1 text-sm p-2 rounded"
                      style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-primary)' }}
                      value={newUpdateText[action.id] ?? ''}
                      onChange={(e) => setNewUpdateText(prev => ({ ...prev, [action.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (newUpdateText[action.id] ?? '').trim()) {
                          const update: ActionUpdate = {
                            id: crypto.randomUUID(),
                            content: (newUpdateText[action.id] ?? '').trim(),
                            createdAt: new Date().toISOString(),
                          };
                          onUpdateAction({ ...action, updates: [...(action.updates ?? []), update] });
                          setNewUpdateText(prev => ({ ...prev, [action.id]: '' }));
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!(newUpdateText[action.id] ?? '').trim()) return;
                        const update: ActionUpdate = {
                          id: crypto.randomUUID(),
                          content: (newUpdateText[action.id] ?? '').trim(),
                          createdAt: new Date().toISOString(),
                        };
                        onUpdateAction({ ...action, updates: [...(action.updates ?? []), update] });
                        setNewUpdateText(prev => ({ ...prev, [action.id]: '' }));
                      }}
                      className="px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-secondary)' }}
                      title="Add update"
                    >
                      <MessageSquarePlus size={16} />
                    </button>
                  </div>
                  {(action.updates ?? []).length === 0 && (
                    <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No updates yet.</p>
                  )}
                  {[...(action.updates ?? [])].reverse().map(update => (
                    <div key={update.id} className="text-sm p-3 rounded" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(update.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => {
                            onUpdateAction({ ...action, updates: (action.updates ?? []).filter(u => u.id !== update.id) });
                          }}
                          className="hover:text-red-400"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Delete update"
                        >
                          <XCircle size={12} />
                        </button>
                      </div>
                      <p style={{ color: 'var(--color-text-secondary)' }}>{update.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              <ClipboardList size={24} /> Investigation Actions
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {treeName} — Tasks to verify or rule out causes
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
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{actions.length}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Actions</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: (statusCounts['In Progress'] ?? 0) > 0 ? 'var(--color-action-progress-text)' : 'var(--color-text-primary)' }}>
              {(statusCounts['Open'] ?? 0) + (statusCounts['In Progress'] ?? 0) + (statusCounts['Blocked'] ?? 0)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Active</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: (statusCounts['Complete'] ?? 0) > 0 ? 'var(--color-action-complete-text)' : 'var(--color-text-primary)' }}>
              {(statusCounts['Complete'] ?? 0) + (statusCounts['Closed'] ?? 0)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Completed</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: overdueCount > 0 ? '#fef2f2' : 'var(--color-surface-primary)', border: overdueCount > 0 ? '1px solid #ef4444' : '1px solid var(--color-border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: overdueCount > 0 ? '#991b1b' : 'var(--color-text-primary)' }}>{overdueCount}</div>
            <div className="text-xs" style={{ color: overdueCount > 0 ? '#991b1b' : 'var(--color-text-muted)' }}>Overdue</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ActionItem['status'] | 'all')}
            className="text-sm rounded px-2 py-1"
            style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)' }}
          >
            <option value="all">All Statuses ({actions.length})</option>
            {ACTION_STATUSES.map(s => (
              <option key={s} value={s}>{s} ({statusCounts[s] ?? 0})</option>
            ))}
          </select>
        </div>

        {/* Action cards */}
        {actions.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Investigation Actions</p>
            <p className="text-sm mt-1">Add actions from the tree inspector to track investigation tasks.</p>
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No {statusFilter} Actions</p>
            <p className="text-sm mt-1">No actions match the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActions.map(renderActionCard)}
          </div>
        )}
      </div>
    </div>
  );
};
