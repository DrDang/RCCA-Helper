export enum NodeStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE', // Orange
  RULED_OUT = 'RULED_OUT', // Green
  CONFIRMED = 'CONFIRMED' // Red
}

export enum NodeType {
  ISSUE = 'ISSUE',
  CATEGORY = 'CATEGORY',
  CAUSE = 'CAUSE'
}

export interface CauseNode {
  id: string;
  parentId: string | null;
  label: string;
  description: string;
  rationale: string;
  status: NodeStatus;
  type: NodeType;
  children?: CauseNode[];
}

export interface ActionItem {
  id: string;
  causeId: string;
  action: string;
  rationale: string;
  assignee: string;
  assignedDate: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Complete' | 'Blocked';
}

export interface Note {
  id: string;
  referenceId: string; // Can map to CauseID or ActionID
  content: string;
  owner: string;
  createdAt: string;
  isEvidence: boolean; // True if this note serves as evidence for ruling out
}

export interface TreeLayoutData {
  x: number;
  y: number;
  data: CauseNode;
  parent?: { x: number; y: number };
}

export interface SavedTree {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  treeData: CauseNode;
  actions: ActionItem[];
  notes: Note[];
}

export interface AppState {
  activeTreeId: string | null;
  trees: SavedTree[];
}