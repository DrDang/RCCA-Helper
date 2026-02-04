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

interface InspectorPanelProps {
  selectedNode: CauseNode | null;
  actions: ActionItem[];
  notes: Note[];
  onUpdateNode: (updatedNode: CauseNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddAction: (action: ActionItem) => void;
  onUpdateAction: (action: ActionItem) => void;
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
  onAddNote,
  onDeleteNote
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'rail' | 'notes'>('details');

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white border-l border-slate-200">
        <ClipboardList size={48} className="mb-4 opacity-50" />
        <h3 className="font-semibold text-lg text-slate-600">No Selection</h3>
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
    onUpdateNode({ ...selectedNode, status: newStatus });
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 w-[450px] shadow-xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{selectedNode.type}</span>
            <h2 className="font-bold text-lg text-slate-800 truncate w-64">{selectedNode.label}</h2>
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
      <div className="flex border-b border-slate-200">
        <button 
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Details
        </button>
        <button 
            onClick={() => setActiveTab('rail')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rail' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            RAIL ({nodeActions.length})
        </button>
        <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Notes ({nodeNotes.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
        
        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
                <textarea 
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    rows={4}
                    value={selectedNode.description}
                    onChange={(e) => onUpdateNode({...selectedNode, description: e.target.value})}
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Investigation Status</label>
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
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Node Label</label>
                <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) => onUpdateNode({...selectedNode, label: e.target.value})}
                    className="w-full p-2 text-sm border border-slate-300 rounded"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Rationale</label>
                <textarea
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    rows={3}
                    placeholder="Why should this cause be investigated? What evidence or reasoning justifies its inclusion?"
                    value={selectedNode.rationale ?? ''}
                    onChange={(e) => onUpdateNode({...selectedNode, rationale: e.target.value})}
                />
            </div>
          </div>
        )}

        {/* RAIL TAB */}
        {activeTab === 'rail' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700">Actions Tracker</h3>
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

                <div className="space-y-3">
                    {nodeActions.length === 0 && <p className="text-xs text-slate-400 italic">No actions tracked for this cause yet.</p>}
                    {nodeActions.map(action => (
                        <div key={action.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm text-sm">
                            <input 
                                className="font-semibold text-slate-800 w-full mb-2 bg-transparent focus:bg-slate-50 outline-none"
                                value={action.action}
                                onChange={(e) => onUpdateAction({...action, action: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <User size={10} />
                                    <input 
                                        className="bg-transparent border-b border-slate-100 focus:border-indigo-500 outline-none w-full"
                                        value={action.assignee}
                                        onChange={(e) => onUpdateAction({...action, assignee: e.target.value})}
                                        placeholder="Assignee"
                                    />
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Calendar size={10} />
                                    <input 
                                        type="date"
                                        className="bg-transparent border-b border-slate-100 focus:border-indigo-500 outline-none w-full"
                                        value={action.dueDate}
                                        onChange={(e) => onUpdateAction({...action, dueDate: e.target.value})}
                                    />
                                </div>
                            </div>
                            <textarea 
                                placeholder="Rationale..."
                                className="w-full text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2 resize-none"
                                value={action.rationale}
                                onChange={(e) => onUpdateAction({...action, rationale: e.target.value})}
                            />
                            <select 
                                value={action.status}
                                onChange={(e) => onUpdateAction({...action, status: e.target.value as any})}
                                className="text-xs w-full border border-slate-200 rounded p-1"
                            >
                                <option>Open</option>
                                <option>In Progress</option>
                                <option>Complete</option>
                                <option>Blocked</option>
                            </select>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700">Notes & Evidence</h3>
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
                    {nodeNotes.length === 0 && <p className="text-xs text-slate-400 italic">No notes recorded.</p>}
                    {nodeNotes.map(note => (
                        <div key={note.id} className={`bg-white p-3 rounded border shadow-sm text-sm relative ${note.isEvidence ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
                            <button 
                                onClick={() => onDeleteNote(note.id)}
                                className="absolute top-2 right-2 text-slate-300 hover:text-red-400"
                            >
                                <XCircle size={12} />
                            </button>
                            
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold text-slate-400">{note.createdAt}</span>
                                <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={note.isEvidence}
                                        onChange={(e) => {
                                            // Find note and update
                                            const updated = {...note, isEvidence: e.target.checked};
                                            // We need to trigger a delete then add to update it in this simple filtering logic, 
                                            // or better, just delete and add, but simpler: let parent handle
                                            onDeleteNote(note.id);
                                            onAddNote(updated);
                                        }}
                                        className="rounded text-green-600 focus:ring-green-500"
                                    />
                                    <span className={note.isEvidence ? "text-green-700 font-semibold" : "text-slate-500"}>Mark as Evidence</span>
                                </label>
                            </div>
                            
                            <textarea 
                                className="w-full text-sm text-slate-700 bg-transparent outline-none resize-none"
                                rows={3}
                                placeholder="Type your note..."
                                value={note.content}
                                onChange={(e) => {
                                     // This is a local edit in the text area, strictly speaking we should bubble up 
                                     // but for smoother typing in this demo we might want to debounce or 
                                     // just assume the user won't type 1000 wpm. 
                                     // For this demo, let's just allow it but strictly we need an onUpdateNote prop.
                                     // I'll skip adding a new prop to keep the interface simple and just "replace" the note
                                     const updated = {...note, content: e.target.value};
                                     onDeleteNote(note.id);
                                     onAddNote(updated);
                                }}
                            />
                            <div className="mt-1 text-xs text-slate-400 text-right">- {note.owner}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};