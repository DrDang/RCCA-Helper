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
          <h2 className="text-xl font-bold text-slate-800">All Investigations</h2>
          <p className="text-sm text-slate-500">{trees.length} investigation{trees.length !== 1 ? 's' : ''}</p>
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
        <div className="text-center text-slate-400 mt-20">
          <p>No investigations yet. Create or import one using the dropdown above.</p>
        </div>
      ) : (() => {
        const ACTION_COLOR_MAP: Record<string, string> = {
          'Open': '#f97316',
          'In Progress': '#3b82f6',
          'Complete': '#22c55e',
          'Blocked': '#ef4444',
          'Closed': '#94a3b8',
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
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
            >
              <div className="p-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: rootColors.border }}
                  />
                  <h3 className="text-sm font-semibold text-slate-800 truncate">{tree.name}</h3>
                </div>
                <div className="text-xs text-slate-400">
                  Updated {formatDate(tree.updatedAt)}
                </div>
              </div>

              <div className="px-4 pb-3">
                <div className="text-xs font-medium text-slate-500 mb-1.5">Nodes</div>
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

              {stats.totalActions > 0 && (
                <div className="px-4 pb-3">
                  <div className="text-xs font-medium text-slate-500 mb-1.5">Actions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(stats.actionsByStatus).map(([status, count]) => {
                      if (count === 0) return null;
                      return (
                        <span
                          key={status}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: '#f8fafc',
                            color: ACTION_COLOR_MAP[status] ?? '#64748b',
                            border: `1px solid ${ACTION_COLOR_MAP[status] ?? '#cbd5e1'}`,
                          }}
                        >
                          {count} {status}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-auto px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {stats.totalNodes} node{stats.totalNodes !== 1 ? 's' : ''} · {stats.totalActions} action{stats.totalActions !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onGenerateReport(tree.id); }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
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
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
                  Active Investigations ({activeTrees.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeTrees.map(renderCard)}
                </div>
              </>
            )}

            {activeTrees.length > 0 && inactiveTrees.length > 0 && (
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 border-t border-slate-300" />
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Inactive / Closed</span>
                <div className="flex-1 border-t border-slate-300" />
              </div>
            )}

            {inactiveTrees.length > 0 && (
              <>
                {activeTrees.length === 0 && (
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
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
