import { CauseNode, NodeStatus, NodeType } from './types';

export const CARD_WIDTH = 220;
export const CARD_HEIGHT = 100;

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

// Theme-aware resolution status colors (resolved via CSS custom properties)
export const RESOLUTION_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Draft': {
    bg: 'var(--color-resolution-draft-bg)',
    border: 'var(--color-resolution-draft-border)',
    text: 'var(--color-resolution-draft-text)'
  },
  'Approved': {
    bg: 'var(--color-resolution-approved-bg)',
    border: 'var(--color-resolution-approved-border)',
    text: 'var(--color-resolution-approved-text)'
  },
  'In Progress': {
    bg: 'var(--color-resolution-progress-bg)',
    border: 'var(--color-resolution-progress-border)',
    text: 'var(--color-resolution-progress-text)'
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
  'Draft': { bg: '#f8fafc', border: '#94a3b8', text: '#475569' },
  'Approved': { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  'In Progress': { bg: '#fefce8', border: '#eab308', text: '#854d0e' },
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
    status: NodeStatus.PENDING,
    type: NodeType.ISSUE,
    children: []
  };
}