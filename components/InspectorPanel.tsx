import React, { useState } from 'react';
import { ActionItem, CauseNode, Note, NodeStatus, NodeType } from '../types';
import { STATUS_COLORS } from '../constants';
import {
    ClipboardList,
    StickyNote,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Plus,
    Trash2,
    Calendar,
    User
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

interface InspectorPanelProps {
  selectedNode: CauseNode | null;
  actions: ActionItem[];
  notes: Note[];
  onUpdateNode: (updatedNode: CauseNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddAction: (action: ActionItem) => void;
  onUpdateAction: (action: ActionItem) => void;
  onDeleteAction: (actionId: string) => void;
  onAddNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  actions,
  notes,
  onUpdateNode,
  onDeleteNode,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onAddNote,
  onDeleteNote
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'rail' | 'notes'>('details');

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ backgroundColor: 'var(--color-surface-primary)', borderLeft: '1px solid var(--color-border-primary)', color: 'var(--color-text-muted)' }}>
        <ClipboardList size={48} className="mb-4 opacity-50" />
        <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text-secondary)' }}>No Selection</h3>
        <p className="text-sm">Select a node from the Cause Tree to view details, manage actions (RAIL), or add evidence.</p>
      </div>
    );
  }

  // Filter items for this node
  const nodeActions = actions.filter(a => a.causeId === selectedNode.id);
  const nodeNotes = notes.filter(n => n.referenceId === selectedNode.id);

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
    <div className="h-full flex flex-col w-[450px] shadow-xl z-20" style={{ backgroundColor: 'var(--color-surface-primary)', borderLeft: '1px solid var(--color-border-primary)' }}>
      {/* Header */}
      <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border-primary)', backgroundColor: 'var(--color-surface-secondary)' }}>
        <div>
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{selectedNode.type}</span>
            <h2 className="font-bold text-lg truncate w-64" style={{ color: 'var(--color-text-primary)' }}>{selectedNode.label}</h2>
        </div>
        <button
            onClick={() => onDeleteNode(selectedNode.id)}
            className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50"
            title="Delete Node"
        >
            <Trash2 size={16} />
        </button>
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
        >
            RAIL ({nodeActions.length})
        </button>
        <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent'}`}
            style={activeTab !== 'notes' ? { color: 'var(--color-text-tertiary)' } : undefined}
        >
            Notes ({nodeNotes.length})
        </button>
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
                <label className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-tertiary)' }}>Node Label</label>
                <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) => onUpdateNode({...selectedNode, label: e.target.value})}
                    className="w-full p-2 text-sm rounded"
                    style={{ backgroundColor: 'var(--color-surface-primary)', borderColor: 'var(--color-border-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)' }}
                />
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

            const renderActionCard = (action: ActionItem) => {
                const colors = ACTION_STATUS_COLORS[action.status] ?? ACTION_STATUS_COLORS['Open'];
                return (
                    <div
                        key={action.id}
                        className="p-3 rounded border shadow-sm text-sm relative"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                        <button
                            onClick={() => onDeleteAction(action.id)}
                            className="absolute top-2 right-2 hover:text-red-400"
                            style={{ color: 'var(--color-text-muted)' }}
                            title="Delete Action"
                        >
                            <XCircle size={14} />
                        </button>
                        <input
                            className="font-semibold w-full mb-2 bg-transparent outline-none pr-6"
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
                    </div>
                );
            };

            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>Actions Tracker</h3>
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

                    {nodeActions.length === 0 && <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No actions tracked for this cause yet.</p>}

                    {activeActions.length > 0 && (
                        <div className="space-y-3">
                            {activeActions.map(renderActionCard)}
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
                            {closedActions.map(renderActionCard)}
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

      </div>
    </div>
  );
};
