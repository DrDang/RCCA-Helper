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
  isRootCause?: boolean;
  children?: CauseNode[];
}

export interface ActionUpdate {
  id: string;
  content: string;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  causeId: string;
  action: string;
  rationale: string;
  assignee: string;
  assignedDate: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Complete' | 'Blocked' | 'Closed';
  updates?: ActionUpdate[];
}

export interface Note {
  id: string;
  referenceId: string; // Can map to CauseID or ActionID
  content: string;
  owner: string;
  createdAt: string;
  isEvidence: boolean; // True if this note serves as evidence for ruling out
}

export type ResolutionStatus =
  | 'Open'         // Newly created, ready to work
  | 'In Progress'  // Implementation underway
  | 'On Hold'      // Temporarily paused
  | 'Implemented'  // Awaiting verification
  | 'Verified'     // Effectiveness confirmed
  | 'Closed';      // Complete

export interface ResolutionItem {
  id: string;
  linkedCauseIds: string[];     // Many-to-many: links to root cause nodes
  title: string;
  description: string;
  owner: string;
  targetDate: string;
  implementedDate: string;
  verificationMethod: string;
  verificationResults: string;
  verifiedDate: string;
  status: ResolutionStatus;
  createdAt: string;
  updatedAt: string;
  updates?: ActionUpdate[];
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
  resolutions: ResolutionItem[];
  isResolved?: boolean;  // True if investigation is complete and should not appear in daily tagups
}

export interface AppSettings {
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
  projectFileName: string;
  theme: 'light' | 'dark';
}

export interface AppState {
  activeTreeId: string | null;
  trees: SavedTree[];
}