import { CauseNode, SavedTree, ActionItem, NodeStatus } from './types';

export interface TreeStats {
  totalNodes: number;
  nodesByStatus: Record<NodeStatus, number>;
  actionsByStatus: Record<string, number>;
  totalActions: number;
  totalNotes: number;
  totalEvidence: number;
  confirmedCauses: CauseNode[];
}

export function flattenTree(node: CauseNode): CauseNode[] {
  const result: CauseNode[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenTree(child));
    }
  }
  return result;
}

export function countNodesByStatus(nodes: CauseNode[]): Record<NodeStatus, number> {
  const counts: Record<NodeStatus, number> = {
    [NodeStatus.PENDING]: 0,
    [NodeStatus.ACTIVE]: 0,
    [NodeStatus.RULED_OUT]: 0,
    [NodeStatus.CONFIRMED]: 0,
  };
  for (const node of nodes) {
    counts[node.status]++;
  }
  return counts;
}

export function countActionsByStatus(actions: ActionItem[]): Record<string, number> {
  const counts: Record<string, number> = {
    'Open': 0,
    'In Progress': 0,
    'Complete': 0,
    'Blocked': 0,
    'Closed': 0,
  };
  for (const action of actions) {
    counts[action.status]++;
  }
  return counts;
}

export function getTreeStats(tree: SavedTree): TreeStats {
  const allNodes = flattenTree(tree.treeData);
  return {
    totalNodes: allNodes.length,
    nodesByStatus: countNodesByStatus(allNodes),
    actionsByStatus: countActionsByStatus(tree.actions),
    totalActions: tree.actions.length,
    totalNotes: tree.notes.length,
    totalEvidence: tree.notes.filter(n => n.isEvidence).length,
    confirmedCauses: allNodes.filter(n => n.status === NodeStatus.CONFIRMED),
  };
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
