import { CauseNode, IssueStatus, NodeStatus, NodeType } from './types';

export const CARD_WIDTH = 240;
export const CARD_HEIGHT = 150;

// Theme-aware status colors (resolved via CSS custom properties)
export const STATUS_COLORS = {
  [NodeStatus.PENDING]: {
    bg: 'var(--color-status-pending-bg)',
    border: 'var(--color-status-pending-border)',
    text: 'var(--color-status-pending-text)'
  },
  [NodeStatus.ACTIVE]: {
    bg: 'var(--color-status-active-bg)',
    border: 'var(--color-status-active-border)',
    text: 'var(--color-status-active-text)'
  },
  [NodeStatus.RULED_OUT]: {
    bg: 'var(--color-status-ruled-out-bg)',
    border: 'var(--color-status-ruled-out-border)',
    text: 'var(--color-status-ruled-out-text)'
  },
  [NodeStatus.CONFIRMED]: {
    bg: 'var(--color-status-confirmed-bg)',
    border: 'var(--color-status-confirmed-border)',
    text: 'var(--color-status-confirmed-text)'
  }
};

// Theme-aware issue lifecycle colors (resolved via CSS custom properties)
export const ISSUE_STATUS_COLORS = {
  [IssueStatus.OPEN]: {
    bg: 'var(--color-issue-open-bg)',
    border: 'var(--color-issue-open-border)',
    text: 'var(--color-issue-open-text)'
  },
  [IssueStatus.INVESTIGATING]: {
    bg: 'var(--color-issue-investigating-bg)',
    border: 'var(--color-issue-investigating-border)',
    text: 'var(--color-issue-investigating-text)'
  },
  [IssueStatus.RESOLVED]: {
    bg: 'var(--color-issue-resolved-bg)',
    border: 'var(--color-issue-resolved-border)',
    text: 'var(--color-issue-resolved-text)'
  },
  [IssueStatus.CLOSED]: {
    bg: 'var(--color-issue-closed-bg)',
    border: 'var(--color-issue-closed-border)',
    text: 'var(--color-issue-closed-text)'
  }
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  [IssueStatus.OPEN]: 'Open',
  [IssueStatus.INVESTIGATING]: 'Investigating',
  [IssueStatus.RESOLVED]: 'Resolved',
  [IssueStatus.CLOSED]: 'Closed',
};

export const NODE_STATUS_LABELS: Record<NodeStatus, string> = {
  [NodeStatus.PENDING]: 'Pending',
  [NodeStatus.ACTIVE]: 'Active',
  [NodeStatus.RULED_OUT]: 'Ruled Out',
  [NodeStatus.CONFIRMED]: 'Confirmed',
};

export function isNodeStatus(status: CauseNode['status']): status is NodeStatus {
  return Object.values(NodeStatus).includes(status as NodeStatus);
}

export function isIssueStatus(status: CauseNode['status']): status is IssueStatus {
  return Object.values(IssueStatus).includes(status as IssueStatus);
}

export function getNodeStatusColors(node: CauseNode): { bg: string; border: string; text: string } {
  if (node.type === NodeType.ISSUE && isIssueStatus(node.status)) {
    return ISSUE_STATUS_COLORS[node.status];
  }
  return STATUS_COLORS[isNodeStatus(node.status) ? node.status : NodeStatus.PENDING];
}

export function getNodeStatusLabel(node: CauseNode): string {
  if (node.type === NodeType.ISSUE && isIssueStatus(node.status)) {
    return ISSUE_STATUS_LABELS[node.status];
  }
  return NODE_STATUS_LABELS[isNodeStatus(node.status) ? node.status : NodeStatus.PENDING];
}

// Hardcoded light-mode colors for standalone HTML reports
export const REPORT_STATUS_COLORS = {
  [NodeStatus.PENDING]: {
    bg: '#f8fafc',
    border: '#cbd5e1',
    text: '#334155'
  },
  [NodeStatus.ACTIVE]: {
    bg: '#fff7ed',
    border: '#f97316',
    text: '#9a3412'
  },
  [NodeStatus.RULED_OUT]: {
    bg: '#f0fdf4',
    border: '#22c55e',
    text: '#166534'
  },
  [NodeStatus.CONFIRMED]: {
    bg: '#fef2f2',
    border: '#ef4444',
    text: '#991b1b'
  }
};

export const REPORT_ISSUE_STATUS_COLORS = {
  [IssueStatus.OPEN]: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  [IssueStatus.INVESTIGATING]: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
  [IssueStatus.RESOLVED]: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  [IssueStatus.CLOSED]: { bg: '#f8fafc', border: '#94a3b8', text: '#475569' },
};

export function getReportNodeStatusColors(node: CauseNode): { bg: string; border: string; text: string } {
  if (node.type === NodeType.ISSUE && isIssueStatus(node.status)) {
    return REPORT_ISSUE_STATUS_COLORS[node.status];
  }
  return REPORT_STATUS_COLORS[isNodeStatus(node.status) ? node.status : NodeStatus.PENDING];
}

// Theme-aware resolution status colors (resolved via CSS custom properties)
export const RESOLUTION_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Open': {
    bg: 'var(--color-resolution-open-bg)',
    border: 'var(--color-resolution-open-border)',
    text: 'var(--color-resolution-open-text)'
  },
  'In Progress': {
    bg: 'var(--color-resolution-progress-bg)',
    border: 'var(--color-resolution-progress-border)',
    text: 'var(--color-resolution-progress-text)'
  },
  'On Hold': {
    bg: 'var(--color-resolution-hold-bg)',
    border: 'var(--color-resolution-hold-border)',
    text: 'var(--color-resolution-hold-text)'
  },
  'Implemented': {
    bg: 'var(--color-resolution-implemented-bg)',
    border: 'var(--color-resolution-implemented-border)',
    text: 'var(--color-resolution-implemented-text)'
  },
  'Verified': {
    bg: 'var(--color-resolution-verified-bg)',
    border: 'var(--color-resolution-verified-border)',
    text: 'var(--color-resolution-verified-text)'
  },
  'Closed': {
    bg: 'var(--color-resolution-closed-bg)',
    border: 'var(--color-resolution-closed-border)',
    text: 'var(--color-resolution-closed-text)'
  }
};

// Hardcoded light-mode colors for resolution statuses in reports
export const REPORT_RESOLUTION_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Open': { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  'In Progress': { bg: '#fefce8', border: '#eab308', text: '#854d0e' },
  'On Hold': { bg: '#f8fafc', border: '#94a3b8', text: '#475569' },
  'Implemented': { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  'Verified': { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  'Closed': { bg: '#f5f5f5', border: '#737373', text: '#525252' }
};

export function createInitialTree(label: string = 'New Issue'): CauseNode {
  return {
    id: crypto.randomUUID(),
    parentId: null,
    label,
    description: 'Describe the primary failure mode here.',
    rationale: '',
    status: IssueStatus.INVESTIGATING,
    type: NodeType.ISSUE,
    children: []
  };
}
