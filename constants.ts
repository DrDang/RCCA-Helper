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