import React from 'react';
import { SavedTree, NodeStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { getTreeStats, formatDate } from '../treeUtils';
import { FileText, FileStack } from 'lucide-react';

interface DashboardViewProps {
  trees: SavedTree[];
  onSelectTree: (id: string) => void;
  onGenerateReport: (id: string) => void;
  onGenerateBulkReport: () => void;
}

const STATUS_LABELS: Record<NodeStatus, string> = {
  [NodeStatus.PENDING]: 'Pending',
  [NodeStatus.ACTIVE]: 'Active',
  [NodeStatus.RULED_OUT]: 'Ruled Out',
  [NodeStatus.CONFIRMED]: 'Confirmed',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  trees,
  onSelectTree,
  onGenerateReport,
  onGenerateBulkReport,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>All Investigations</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{trees.length} investigation{trees.length !== 1 ? 's' : ''}</p>
        </div>
        {trees.length > 0 && (
          <button
            onClick={onGenerateBulkReport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <FileStack size={16} />
            Generate All Reports
          </button>
        )}
      </div>

      {/* Card grid */}
      {trees.length === 0 ? (
        <div className="text-center mt-20" style={{ color: 'var(--color-text-muted)' }}>
          <p>No investigations yet. Create or import one using the dropdown above.</p>
        </div>
      ) : (() => {
        const ACTION_COLOR_MAP: Record<string, string> = {
          'Open': 'var(--color-action-open-text)',
          'In Progress': 'var(--color-action-progress-text)',
          'Complete': 'var(--color-action-complete-text)',
          'Blocked': 'var(--color-action-blocked-text)',
          'Closed': 'var(--color-action-closed-text)',
        };

        const ACTION_BORDER_MAP: Record<string, string> = {
          'Open': 'var(--color-action-open-border)',
          'In Progress': 'var(--color-action-progress-border)',
          'Complete': 'var(--color-action-complete-border)',
          'Blocked': 'var(--color-action-blocked-border)',
          'Closed': 'var(--color-action-closed-border)',
        };

        // Determine if an investigation is "active" (has work in progress)
        const isActive = (tree: SavedTree) => {
          const stats = getTreeStats(tree);
          const hasActiveNodes = stats.nodesByStatus[NodeStatus.ACTIVE] > 0 || stats.nodesByStatus[NodeStatus.CONFIRMED] > 0;
          const hasOpenActions = (stats.actionsByStatus['Open'] ?? 0) > 0
            || (stats.actionsByStatus['In Progress'] ?? 0) > 0
            || (stats.actionsByStatus['Blocked'] ?? 0) > 0;
          return hasActiveNodes || hasOpenActions;
        };

        const activeTrees = trees.filter(isActive);
        const inactiveTrees = trees.filter(t => !isActive(t));

        const renderCard = (tree: SavedTree) => {
          const stats = getTreeStats(tree);
          const rootColors = STATUS_COLORS[tree.treeData.status];

          return (
            <div
              key={tree.id}
              onClick={() => onSelectTree(tree.id)}
              className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
              style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-primary)' }}
            >
              <div className="p-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: rootColors.border }}
                  />
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tree.name}</h3>
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Updated {formatDate(tree.updatedAt)}
                </div>
              </div>

              <div className="px-4 pb-3">
                <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Nodes</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(NodeStatus).map(status => {
                    const count = stats.nodesByStatus[status];
                    if (count === 0) return null;
                    const colors = STATUS_COLORS[status];
                    return (
                      <span
                        key={status}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {count} {STATUS_LABELS[status]}
                      </span>
                    );
                  })}
                </div>
              </div>

              {stats.rootCauses.length > 0 && (
                <div className="px-4 pb-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}
                  >
                    {stats.rootCauses.length} Root Cause{stats.rootCauses.length !== 1 ? 's' : ''} Identified
                  </span>
                </div>
              )}

              {stats.totalActions > 0 && (
                <div className="px-4 pb-3">
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Actions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(stats.actionsByStatus).map(([status, count]) => {
                      if (count === 0) return null;
                      return (
                        <span
                          key={status}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--color-surface-tertiary)',
                            color: ACTION_COLOR_MAP[status] ?? 'var(--color-text-secondary)',
                            border: `1px solid ${ACTION_BORDER_MAP[status] ?? 'var(--color-border-secondary)'}`,
                          }}
                        >
                          {count} {status}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-auto px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {stats.totalNodes} node{stats.totalNodes !== 1 ? 's' : ''} · {stats.totalActions} action{stats.totalActions !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onGenerateReport(tree.id); }}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Generate Report"
                >
                  <FileText size={14} />
                </button>
              </div>
            </div>
          );
        };

        return (
          <div>
            {activeTrees.length > 0 && (
              <>
                <div className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Active Investigations ({activeTrees.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeTrees.map(renderCard)}
                </div>
              </>
            )}

            {activeTrees.length > 0 && inactiveTrees.length > 0 && (
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1" style={{ borderTop: '1px solid var(--color-border-secondary)' }} />
                <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>Inactive / Closed</span>
                <div className="flex-1" style={{ borderTop: '1px solid var(--color-border-secondary)' }} />
              </div>
            )}

            {inactiveTrees.length > 0 && (
              <>
                {activeTrees.length === 0 && (
                  <div className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                    Inactive / Closed ({inactiveTrees.length})
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {inactiveTrees.map(renderCard)}
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
};
