import { CauseNode, NodeStatus, NodeType } from './types';

export const CARD_WIDTH = 220;
export const CARD_HEIGHT = 100;

export const STATUS_COLORS = {
  [NodeStatus.PENDING]: {
    bg: '#f8fafc', // slate-50
    border: '#cbd5e1', // slate-300
    text: '#334155'
  },
  [NodeStatus.ACTIVE]: {
    bg: '#fff7ed', // orange-50
    border: '#f97316', // orange-500
    text: '#9a3412'
  },
  [NodeStatus.RULED_OUT]: {
    bg: '#f0fdf4', // green-50
    border: '#22c55e', // green-500
    text: '#166534'
  },
  [NodeStatus.CONFIRMED]: {
    bg: '#fef2f2', // red-50
    border: '#ef4444', // red-500
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