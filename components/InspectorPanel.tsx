import React, { useState, useRef, useCallback } from 'react';
import { ActionItem, ActionUpdate, CauseNode, Note, NodeStatus, NodeType, ResolutionItem, ResolutionStatus } from '../types';
import { STATUS_COLORS, RESOLUTION_STATUS_COLORS } from '../constants';
import {
    ClipboardList,
    StickyNote,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Plus,
    Trash2,
    Calendar,
    User,
    Shield,
    Link2,
    ChevronDown,
    ChevronUp,
    X,
    GripVertical,
    MessageSquarePlus,
    ChevronRight
} from 'lucide-react';

const ACTION_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Open': { bg: 'var(--color-action-open-bg)', border: 'var(--color-action-open-border)', text: 'var(--color-action-open-text)' },
  'In Progress': { bg: 'var(--color-action-progress-bg)', border: 'var(--color-action-progress-border)', text: 'var(--color-action-progress-text)' },
  'Complete': { bg: 'var(--color-action-complete-bg)', border: 'var(--color-action-complete-border)', text: 'var(--color-action-complete-text)' },
  'Blocked': { bg: 'var(--color-action-blocked-bg)', border: 'var(--color-action-blocked-border)', text: 'var(--color-action-blocked-text)' },
  'Closed': { bg: 'var(--color-action-closed-bg)', border: 'var(--color-action-closed-border)', text: 'var(--color-action-closed-text)' },
};

// Active statuses float to top, terminal statuses sink to bottom
const ACTION_STATUS_ORDER: Record<string, number> = {
  'Blocked': 0,
  'In Progress': 1,
  'Open': 2,
  'Complete': 3,
  'Closed': 4,
};

// Resolution status order: active on top, terminal at bottom
const RESOLUTION_STATUS_ORDER: Record<string, number> = {
  'In Progress': 0,
  'Approved': 1,
  'Draft': 2,
  'Implemented': 3,
  'Verified': 4,
  'Closed': 5,
};

const RESOLUTION_STATUSES: ResolutionStatus[] = [
  'Draft', 'Approved', 'In Progress', 'Implemented', 'Verified', 'Closed'
];

interface InspectorPanelProps {
  selectedNode: CauseNode | null;
  actions: ActionItem[];
  notes: Note[];
  resolutions: ResolutionItem[];
  allRootCauses: CauseNode[];
  onUpdateNode: (updatedNode: CauseNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddAction: (action: ActionItem) => void;
  onUpdateAction: (action: ActionItem) => void;
  onDeleteAction: (actionId: string) => void;
  onAddNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onAddResolution: (resolution: ResolutionItem) => void;
  onUpdateResolution: (resolution: ResolutionItem) => void;
  onDeleteResolution: (resolutionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  actions,
  notes,
  resolutions,
  allRootCauses,
  onUpdateNode,
  onDeleteNode,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onAddNote,
  onDeleteNote,
  onAddResolution,
  onUpdateResolution,
  onDeleteResolution,
  isOpen,
  onClose,
  width,
  onWidthChange
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'rail' | 'notes' | 'resolutions'>('details');
  const [expandedResolutionId, setExpandedResolutionId] = useState<string | null>(null);
  const [expandedActionUpdates, setExpandedActionUpdates] = useState<Record<string, boolean>>({});
  const [expandedResolutionUpdates, setExpandedResolutionUpdates] = useState<Record<string, boolean>>({});
  const [newUpdateText, setNewUpdateText] = useState<Record<string, string>>({});
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.min(800, Math.max(300, startWidth + delta));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, onWidthChange]);

  if (!isOpen) {
    return null;
  }

  if (!selectedNode) {
    return (
      <div
        ref={panelRef}
        className="h-full flex flex-col items-center justify-center p-8 text-center relative"
        style={{ backgroundColor: 'var(--color-surface-primary)', borderLeft: '1px solid var(--color-border-primary)', color: 'var(--color-text-muted)', width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400 transition-colors flex items-center justify-center group"
          onMouseDown={handleMouseDown}
          style={{ backgroundColor: isResizing ? 'var(--color-indigo-400)' : 'transparent' }}
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
            <GripVertical size={12} />
          </div>
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          title="Close panel"
        >
          <X size={18} />
        </button>
        <ClipboardList size={48} className="mb-4 opacity-50" />
        <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text-secondary)' }}>No Selection</h3>
        <p className="text-sm">Select a node from the Cause Tree to view details, manage actions (RAIL), or add evidence.</p>
      </div>
    );
  }

  // Filter items for this node
  const nodeActions = actions.filter(a => a.causeId === selectedNode.id);
  const nodeNotes = notes.filter(n => n.referenceId === selectedNode.id);

  // Check if this is a root cause node (for showing Resolutions tab)
  const isRootCauseNode = selectedNode.status === NodeStatus.CONFIRMED && selectedNode.isRootCause === true;

  // Filter resolutions linked to this node
  const nodeResolutions = resolutions.filter(r => r.linkedCauseIds.includes(selectedNode.id));

  const handleStatusChange = (newStatus: NodeStatus) => {
    if (newStatus === NodeStatus.RULED_OUT) {
       // Check for evidence note
       const hasEvidence = nodeNotes.some(n => n.isEvidence);
       if (!hasEvidence) {
           alert("Policy Violation: You cannot rule out a cause without attaching evidence. Please add a Note marked as Evidence first.");
           setActiveTab('notes');
           return;
       }
    }
    const updatedNode = { ...selectedNode, status: newStatus };
    if (newStatus !== NodeStatus.CONFIRMED) {
      updatedNode.isRootCause = false;
    }
    onUpdateNode(updatedNode);
  };

  return (
    <div
      ref={panelRef}
      className="h-full flex flex-col shadow-xl z-20 relative"
      style={{ backgroundColor: 'var(--color-surface-primary)', borderLeft: '1px solid var(--color-border-primary)', width: `${width}px` }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400 transition-colors flex items-center justify-center group z-10"
        onMouseDown={handleMouseDown}
        style={{ backgroundColor: isResizing ? 'var(--color-indigo-400)' : 'transparent' }}
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
          <GripVertical size={12} />
        </div>
      </div>

      {/* Header */}
      <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border-primary)', backgroundColor: 'var(--color-surface-secondary)' }}>
        <div className="flex-1 min-w-0 pr-2">
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{selectedNode.type}</span>
            <input
                type="text"
                value={selectedNode.label}
                onChange={(e) => onUpdateNode({...selectedNode, label: e.target.value})}
                className="font-bold text-lg w-full bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 transition-colors"
                style={{ color: 'var(--color-text-primary)' }}
                placeholder="Node name..."
            />
        </div>
        <div className="flex items-center gap-1">
          <button
              onClick={() => onDeleteNode(selectedNode.id)}
              className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete Node"
          >
              <Trash2 size={16} />
          </button>
          <button
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Close panel"
          >
              <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
        <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-500 text-indigo-600' : 'border-transparent'}`}
            style={activeTab !== 'details' ? { color: 'var(--color-text-tertiary)' } : undefined}
        >
            Details
        </button>
        <button
            onClick={() => setActiveTab('rail')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rail' ? 'border-indigo-500 text-indigo-600' : 'border-transparent'}`}
            style={activeTab !== 'rail' ? { color: 'var(--color-text-tertiary)' } : undefined}
            title="Investigation actions to verify or rule out this cause"
        >
            Investigate ({nodeActions.length})
        </button>
        <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent'}`}
            style={activeTab !== 'notes' ? { color: 'var(--color-text-tertiary)' } : undefined}
        >
            Notes ({nodeNotes.length})
        </button>
        {isRootCauseNode && (
          <button
              onClick={() => setActiveTab('resolutions')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'resolutions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent'}`}
              style={activeTab !== 'resolutions' ? { color: 'var(--color-text-tertiary)' } : undefined}
              title="Corrective actions to fix this root cause"
          >
              Corrective ({nodeResolutions.length})
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-tertiary)' }}>Description</label>
                <textarea
                    className="w-full p-2 text-sm rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ backgroundColor: 'var(--color-surface-primary)', borderColor: 'var(--color-border-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}
                    rows={4}
                    value={selectedNode.description}
                    onChange={(e) => onUpdateNode({...selectedNode, description: e.target.value})}
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-tertiary)' }}>Investigation Status</label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(NodeStatus).map((status) => (
                        <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className={`
                                p-2 rounded text-xs font-medium border transition-all flex items-center gap-2 justify-center
                                ${selectedNode.status === status ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-70 hover:opacity-100'}
                            `}
                            style={{
                                backgroundColor: STATUS_COLORS[status].bg,
                                borderColor: STATUS_COLORS[status].border,
                                color: STATUS_COLORS[status].text
                            }}
                        >
                            {status === NodeStatus.PENDING && <AlertTriangle size={12} />}
                            {status === NodeStatus.ACTIVE && <ClipboardList size={12} />}
                            {status === NodeStatus.RULED_OUT && <CheckCircle2 size={12} />}
                            {status === NodeStatus.CONFIRMED && <XCircle size={12} />}
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                {selectedNode.status === NodeStatus.RULED_OUT && (
                    <p className="text-xs text-green-600 italic mt-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Evidence verified.
                    </p>
                )}
                {selectedNode.status === NodeStatus.CONFIRMED && (
                    <div className="mt-3 p-3 rounded-lg border-2 border-amber-300 bg-amber-50">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={selectedNode.isRootCause ?? false}
                                onChange={(e) => onUpdateNode({...selectedNode, isRootCause: e.target.checked})}
                                className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-sm font-semibold text-amber-800">Mark as Root Cause</span>
                        </label>
                        <p className="text-xs text-amber-600 mt-1">
                            Designate this confirmed cause as a root cause of the investigation.
                        </p>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-tertiary)' }}>Rationale</label>
                <textarea
                    className="w-full p-2 text-sm rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ backgroundColor: 'var(--color-surface-primary)', borderColor: 'var(--color-border-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}
                    rows={3}
                    placeholder="Why should this cause be investigated? What evidence or reasoning justifies its inclusion?"
                    value={selectedNode.rationale ?? ''}
                    onChange={(e) => onUpdateNode({...selectedNode, rationale: e.target.value})}
                />
            </div>
          </div>
        )}

        {/* RAIL TAB */}
        {activeTab === 'rail' && (() => {
            const sorted = [...nodeActions].sort((a, b) =>
              (ACTION_STATUS_ORDER[a.status] ?? 99) - (ACTION_STATUS_ORDER[b.status] ?? 99)
            );
            const activeActions = sorted.filter(a => a.status !== 'Complete' && a.status !== 'Closed');
            const closedActions = sorted.filter(a => a.status === 'Complete' || a.status === 'Closed');

            const renderActionCard = (action: ActionItem, displayIndex: number) => {
                const colors = ACTION_STATUS_COLORS[action.status] ?? ACTION_STATUS_COLORS['Open'];
                return (
                    <div
                        key={action.id}
                        className="p-3 rounded border shadow-sm text-sm relative"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-muted)' }}
                                title={`Task ID: ${displayIndex}`}
                            >
                                #{displayIndex}
                            </span>
                            <button
                                onClick={() => {
                                    if (window.confirm(`Delete action "${action.action}"? This cannot be undone.`)) {
                                        onDeleteAction(action.id);
                                    }
                                }}
                                className="hover:text-red-400"
                                style={{ color: 'var(--color-text-muted)' }}
                                title="Delete Action"
                            >
                                <XCircle size={14} />
                            </button>
                        </div>
                        <input
                            className="font-semibold w-full mb-2 bg-transparent outline-none pr-16"
                            style={{ color: colors.text }}
                            value={action.action}
                            onChange={(e) => onUpdateAction({...action, action: e.target.value})}
                        />
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                <User size={10} />
                                <input
                                    className="bg-transparent outline-none w-full"
                                    style={{ borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)' }}
                                    value={action.assignee}
                                    onChange={(e) => onUpdateAction({...action, assignee: e.target.value})}
                                    placeholder="Assignee"
                                />
                            </div>
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                <Calendar size={10} />
                                <input
                                    type="date"
                                    className="bg-transparent outline-none w-full"
                                    style={{ borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)' }}
                                    value={action.dueDate}
                                    onChange={(e) => onUpdateAction({...action, dueDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <textarea
                            placeholder="Rationale..."
                            className="w-full text-xs p-2 rounded mb-2 resize-none"
                            style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', opacity: 0.7 }}
                            value={action.rationale}
                            onChange={(e) => onUpdateAction({...action, rationale: e.target.value})}
                        />
                        <select
                            value={action.status}
                            onChange={(e) => onUpdateAction({...action, status: e.target.value as ActionItem['status']})}
                            className="text-xs w-full border rounded p-1"
                            style={{ borderColor: colors.border, color: colors.text, backgroundColor: 'var(--color-surface-primary)' }}
                        >
                            <option>Open</option>
                            <option>In Progress</option>
                            <option>Complete</option>
                            <option>Blocked</option>
                            <option>Closed</option>
                        </select>

                        {/* Updates / Activity Log */}
                        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
                            <button
                                onClick={() => setExpandedActionUpdates(prev => ({ ...prev, [action.id]: !prev[action.id] }))}
                                className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold w-full"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                <ChevronRight
                                    size={12}
                                    className={`transition-transform ${expandedActionUpdates[action.id] ? 'rotate-90' : ''}`}
                                />
                                Updates ({(action.updates ?? []).length})
                            </button>

                            {expandedActionUpdates[action.id] && (
                                <div className="mt-2 space-y-2">
                                    {/* Add new update */}
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            placeholder="Add update..."
                                            className="flex-1 text-xs p-1.5 rounded"
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
                                            className="px-2 py-1 rounded text-xs"
                                            style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-secondary)' }}
                                            title="Add update"
                                        >
                                            <MessageSquarePlus size={13} />
                                        </button>
                                    </div>

                                    {/* Update list (newest first) */}
                                    {(action.updates ?? []).length === 0 && (
                                        <p className="text-[10px] italic" style={{ color: 'var(--color-text-muted)' }}>No updates yet.</p>
                                    )}
                                    {[...(action.updates ?? [])].reverse().map(update => (
                                        <div key={update.id} className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
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
                                                    <XCircle size={10} />
                                                </button>
                                            </div>
                                            <p style={{ color: 'var(--color-text-secondary)' }}>{update.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            };

            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>Investigation Actions</h3>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Tasks to verify or rule out this cause</p>
                        </div>
                        <button
                            onClick={() => onAddAction({
                                id: crypto.randomUUID(),
                                causeId: selectedNode.id,
                                action: 'New Action',
                                rationale: '',
                                assignee: 'Unassigned',
                                assignedDate: new Date().toISOString().split('T')[0],
                                dueDate: '',
                                status: 'Open'
                            })}
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>

                    {nodeActions.length === 0 && <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No investigation actions for this cause yet.</p>}

                    {activeActions.length > 0 && (
                        <div className="space-y-3">
                            {activeActions.map(action => {
                                const displayIndex = nodeActions.indexOf(action) + 1;
                                return renderActionCard(action, displayIndex);
                            })}
                        </div>
                    )}

                    {activeActions.length > 0 && closedActions.length > 0 && (
                        <div className="flex items-center gap-2 py-1">
                            <div className="flex-1" style={{ borderTop: '1px solid var(--color-border-secondary)' }} />
                            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>Completed / Closed</span>
                            <div className="flex-1" style={{ borderTop: '1px solid var(--color-border-secondary)' }} />
                        </div>
                    )}

                    {closedActions.length > 0 && (
                        <div className="space-y-3">
                            {closedActions.map(action => {
                                const displayIndex = nodeActions.indexOf(action) + 1;
                                return renderActionCard(action, displayIndex);
                            })}
                        </div>
                    )}
                </div>
            );
        })()}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>Notes & Evidence</h3>
                    <button
                        onClick={() => onAddNote({
                            id: crypto.randomUUID(),
                            referenceId: selectedNode.id,
                            content: '',
                            owner: 'Me',
                            createdAt: new Date().toLocaleDateString(),
                            isEvidence: false
                        })}
                        className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
                    >
                        <Plus size={12} /> Add
                    </button>
                </div>

                <div className="space-y-3">
                    {nodeNotes.length === 0 && <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No notes recorded.</p>}
                    {nodeNotes.map(note => (
                        <div
                            key={note.id}
                            className="p-3 rounded border shadow-sm text-sm relative"
                            style={{
                                backgroundColor: note.isEvidence ? 'var(--color-status-ruled-out-bg)' : 'var(--color-surface-primary)',
                                borderColor: note.isEvidence ? 'var(--color-status-ruled-out-border)' : 'var(--color-border-primary)',
                            }}
                        >
                            <button
                                onClick={() => onDeleteNote(note.id)}
                                className="absolute top-2 right-2 hover:text-red-400"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                <XCircle size={12} />
                            </button>

                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>{note.createdAt}</span>
                                <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={note.isEvidence}
                                        onChange={(e) => {
                                            const updated = {...note, isEvidence: e.target.checked};
                                            onDeleteNote(note.id);
                                            onAddNote(updated);
                                        }}
                                        className="rounded text-green-600 focus:ring-green-500"
                                    />
                                    <span style={{ color: note.isEvidence ? 'var(--color-status-ruled-out-text)' : 'var(--color-text-tertiary)', fontWeight: note.isEvidence ? 600 : 400 }}>Mark as Evidence</span>
                                </label>
                            </div>

                            <textarea
                                className="w-full text-sm bg-transparent outline-none resize-none"
                                style={{ color: 'var(--color-text-secondary)' }}
                                rows={3}
                                placeholder="Type your note..."
                                value={note.content}
                                onChange={(e) => {
                                     const updated = {...note, content: e.target.value};
                                     onDeleteNote(note.id);
                                     onAddNote(updated);
                                }}
                            />
                            <div className="mt-1 text-xs text-right" style={{ color: 'var(--color-text-muted)' }}>- {note.owner}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* RESOLUTIONS TAB */}
        {activeTab === 'resolutions' && isRootCauseNode && (() => {
            const sorted = [...nodeResolutions].sort((a, b) =>
              (RESOLUTION_STATUS_ORDER[a.status] ?? 99) - (RESOLUTION_STATUS_ORDER[b.status] ?? 99)
            );
            const activeResolutions = sorted.filter(r => r.status !== 'Verified' && r.status !== 'Closed');
            const closedResolutions = sorted.filter(r => r.status === 'Verified' || r.status === 'Closed');

            const createNewResolution = (): ResolutionItem => ({
              id: crypto.randomUUID(),
              linkedCauseIds: [selectedNode.id],
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

            const renderResolutionCard = (resolution: ResolutionItem, displayIndex: number) => {
                const colors = RESOLUTION_STATUS_COLORS[resolution.status] ?? RESOLUTION_STATUS_COLORS['Draft'];
                const isExpanded = expandedResolutionId === resolution.id;
                const linkedCauseCount = resolution.linkedCauseIds.length;

                return (
                    <div
                        key={resolution.id}
                        className="p-3 rounded border shadow-sm text-sm relative"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <input
                                className="font-semibold flex-1 bg-transparent outline-none pr-16"
                                style={{ color: colors.text }}
                                value={resolution.title}
                                onChange={(e) => onUpdateResolution({...resolution, title: e.target.value})}
                                placeholder="Resolution title..."
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-muted)' }}
                                    title={`Resolution ID: ${displayIndex}`}
                                >
                                    #R{displayIndex}
                                </span>
                                <button
                                    onClick={() => setExpandedResolutionId(isExpanded ? null : resolution.id)}
                                    className="p-1 rounded hover:bg-black/10"
                                    style={{ color: 'var(--color-text-muted)' }}
                                    title={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Delete resolution "${resolution.title}"? This cannot be undone.`)) {
                                            onDeleteResolution(resolution.id);
                                        }
                                    }}
                                    className="p-1 rounded hover:text-red-400"
                                    style={{ color: 'var(--color-text-muted)' }}
                                    title="Delete Resolution"
                                >
                                    <XCircle size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Summary row */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                <User size={10} />
                                <input
                                    className="bg-transparent outline-none w-full"
                                    style={{ borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)' }}
                                    value={resolution.owner}
                                    onChange={(e) => onUpdateResolution({...resolution, owner: e.target.value})}
                                    placeholder="Owner"
                                />
                            </div>
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                <Calendar size={10} />
                                <input
                                    type="date"
                                    className="bg-transparent outline-none w-full"
                                    style={{ borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)' }}
                                    value={resolution.targetDate}
                                    onChange={(e) => onUpdateResolution({...resolution, targetDate: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Linked causes indicator */}
                        <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                            <Link2 size={10} />
                            <span>{linkedCauseCount} linked root cause{linkedCauseCount !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Status dropdown */}
                        <select
                            value={resolution.status}
                            onChange={(e) => onUpdateResolution({...resolution, status: e.target.value as ResolutionStatus})}
                            className="text-xs w-full border rounded p-1 mb-2"
                            style={{ borderColor: colors.border, color: colors.text, backgroundColor: 'var(--color-surface-primary)' }}
                        >
                            {RESOLUTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        {/* Expanded content */}
                        {isExpanded && (
                            <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
                                <div>
                                    <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Description</label>
                                    <textarea
                                        className="w-full text-xs p-2 rounded resize-none mt-1"
                                        style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)' }}
                                        rows={2}
                                        value={resolution.description}
                                        onChange={(e) => onUpdateResolution({...resolution, description: e.target.value})}
                                        placeholder="Describe the corrective action..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Verification Method</label>
                                    <textarea
                                        className="w-full text-xs p-2 rounded resize-none mt-1"
                                        style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)' }}
                                        rows={2}
                                        value={resolution.verificationMethod}
                                        onChange={(e) => onUpdateResolution({...resolution, verificationMethod: e.target.value})}
                                        placeholder="How will effectiveness be verified?"
                                    />
                                </div>

                                {(resolution.status === 'Implemented' || resolution.status === 'Verified' || resolution.status === 'Closed') && (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Implemented Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-xs p-1 rounded mt-1"
                                                    style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                                                    value={resolution.implementedDate}
                                                    onChange={(e) => onUpdateResolution({...resolution, implementedDate: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Verified Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-xs p-1 rounded mt-1"
                                                    style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-primary)' }}
                                                    value={resolution.verifiedDate}
                                                    onChange={(e) => onUpdateResolution({...resolution, verifiedDate: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Verification Results</label>
                                            <textarea
                                                className="w-full text-xs p-2 rounded resize-none mt-1"
                                                style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)' }}
                                                rows={2}
                                                value={resolution.verificationResults}
                                                onChange={(e) => onUpdateResolution({...resolution, verificationResults: e.target.value})}
                                                placeholder="Document verification results..."
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Link to other root causes */}
                                {allRootCauses.length > 1 && (
                                    <div>
                                        <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Link to Root Causes</label>
                                        <div className="mt-1 space-y-1">
                                            {allRootCauses.map(rc => (
                                                <label key={rc.id} className="flex items-center gap-2 text-xs cursor-pointer">
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

                                {/* Updates / Activity Log */}
                                <div className="pt-2" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
                                    <button
                                        onClick={() => setExpandedResolutionUpdates(prev => ({ ...prev, [resolution.id]: !prev[resolution.id] }))}
                                        className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold w-full"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        <ChevronRight
                                            size={12}
                                            className={`transition-transform ${expandedResolutionUpdates[resolution.id] ? 'rotate-90' : ''}`}
                                        />
                                        Updates ({(resolution.updates ?? []).length})
                                    </button>

                                    {expandedResolutionUpdates[resolution.id] && (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    placeholder="Add update..."
                                                    className="flex-1 text-xs p-1.5 rounded"
                                                    style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-primary)' }}
                                                    value={newUpdateText[resolution.id] ?? ''}
                                                    onChange={(e) => setNewUpdateText(prev => ({ ...prev, [resolution.id]: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && (newUpdateText[resolution.id] ?? '').trim()) {
                                                            const update: ActionUpdate = {
                                                                id: crypto.randomUUID(),
                                                                content: (newUpdateText[resolution.id] ?? '').trim(),
                                                                createdAt: new Date().toISOString(),
                                                            };
                                                            onUpdateResolution({ ...resolution, updates: [...(resolution.updates ?? []), update] });
                                                            setNewUpdateText(prev => ({ ...prev, [resolution.id]: '' }));
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (!(newUpdateText[resolution.id] ?? '').trim()) return;
                                                        const update: ActionUpdate = {
                                                            id: crypto.randomUUID(),
                                                            content: (newUpdateText[resolution.id] ?? '').trim(),
                                                            createdAt: new Date().toISOString(),
                                                        };
                                                        onUpdateResolution({ ...resolution, updates: [...(resolution.updates ?? []), update] });
                                                        setNewUpdateText(prev => ({ ...prev, [resolution.id]: '' }));
                                                    }}
                                                    className="px-2 py-1 rounded text-xs"
                                                    style={{ backgroundColor: 'var(--color-surface-primary)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-secondary)' }}
                                                    title="Add update"
                                                >
                                                    <MessageSquarePlus size={13} />
                                                </button>
                                            </div>
                                            {(resolution.updates ?? []).length === 0 && (
                                                <p className="text-[10px] italic" style={{ color: 'var(--color-text-muted)' }}>No updates yet.</p>
                                            )}
                                            {[...(resolution.updates ?? [])].reverse().map(update => (
                                                <div key={update.id} className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                                            {new Date(update.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                onUpdateResolution({ ...resolution, updates: (resolution.updates ?? []).filter(u => u.id !== update.id) });
                                                            }}
                                                            className="hover:text-red-400"
                                                            style={{ color: 'var(--color-text-muted)' }}
                                                            title="Delete update"
                                                        >
                                                            <XCircle size={10} />
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
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                                <Shield size={14} /> Corrective Actions
                            </h3>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Actions to fix this confirmed root cause</p>
                        </div>
                        <button
                            onClick={() => onAddResolution(createNewResolution())}
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>

                    {nodeResolutions.length === 0 && (
                        <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                            No corrective actions defined for this root cause yet.
                        </p>
                    )}

                    {activeResolutions.length > 0 && (
                        <div className="space-y-3">
                            {activeResolutions.map(resolution => {
                                const displayIndex = nodeResolutions.indexOf(resolution) + 1;
                                return renderResolutionCard(resolution, displayIndex);
                            })}
                        </div>
                    )}

                    {activeResolutions.length > 0 && closedResolutions.length > 0 && (
                        <div className="flex items-center gap-2 py-1">
                            <div className="flex-1" style={{ borderTop: '1px solid var(--color-border-secondary)' }} />
                            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>Verified / Closed</span>
                            <div className="flex-1" style={{ borderTop: '1px solid var(--color-border-secondary)' }} />
                        </div>
                    )}

                    {closedResolutions.length > 0 && (
                        <div className="space-y-3">
                            {closedResolutions.map(resolution => {
                                const displayIndex = nodeResolutions.indexOf(resolution) + 1;
                                return renderResolutionCard(resolution, displayIndex);
                            })}
                        </div>
                    )}
                </div>
            );
        })()}

      </div>
    </div>
  );
};
