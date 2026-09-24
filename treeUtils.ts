import { CauseNode, SavedTree, ActionItem, ResolutionItem, NodeStatus, NodeType } from './types';
import { isNodeStatus } from './constants';

export interface TreeStats {
  totalNodes: number;
  nodesByStatus: Record<NodeStatus, number>;
  actionsByStatus: Record<string, number>;
  totalActions: number;
  totalNotes: number;
  totalEvidence: number;
  confirmedCauses: CauseNode[];
  rootCauses: CauseNode[];
  resolutionsByStatus: Record<string, number>;
  totalResolutions: number;
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

export function getReparentError(root: CauseNode, nodeId: string, parentId: string): string | null {
  const nodes = flattenTree(root);
  const node = nodes.find(item => item.id === nodeId);
  const parent = nodes.find(item => item.id === parentId);
  if (!node || !parent) return 'This node is no longer in the tree.';
  if (node.id === root.id) return 'The root issue cannot be moved.';
  if (node.id === parent.id) return 'A node cannot be its own parent.';
  if (flattenTree(node).some(item => item.id === parentId)) return 'A node cannot move under its own descendant.';
  if (parent.children?.some(item => item.id === nodeId)) return 'This node is already a child of that parent.';
  return null;
}

// Move the original subtree without changing IDs or the records linked to them.
export function reparentNode(root: CauseNode, nodeId: string, parentId: string): CauseNode {
  if (getReparentError(root, nodeId, parentId)) return root;
  const node = flattenTree(root).find(item => item.id === nodeId)!;
  const moved = { ...node, parentId };
  const visit = (current: CauseNode): CauseNode => {
    const children = current.children?.filter(child => child.id !== nodeId).map(visit);
    if (current.id === parentId) {
      return { ...current, isRootCause: false, children: [...(children ?? []), moved] };
    }
    return children ? { ...current, children } : current;
  };
  return visit(root);
}

export function findRuledOutAncestor(root: CauseNode, targetId: string): CauseNode | null {
  const visit = (node: CauseNode, ruledOutAncestor: CauseNode | null): CauseNode | null | undefined => {
    if (node.id === targetId) return ruledOutAncestor;
    const nextAncestor = node.status === NodeStatus.RULED_OUT ? node : ruledOutAncestor;
    for (const child of node.children ?? []) {
      const result = visit(child, nextAncestor);
      if (result !== undefined) return result;
    }
    return undefined;
  };

  return visit(root, null) ?? null;
}

export function applyInheritedRuleOut(node: CauseNode, ruledOutAncestor: CauseNode | null = null): CauseNode {
  const isExcluded = ruledOutAncestor !== null;
  const nextAncestor = ruledOutAncestor ?? (node.status === NodeStatus.RULED_OUT ? node : null);
  return {
    ...node,
    ...(isExcluded ? { status: NodeStatus.RULED_OUT, isRootCause: false } : {}),
    children: node.children?.map(child => applyInheritedRuleOut(child, nextAncestor)),
  };
}

export function countNodesByStatus(nodes: CauseNode[]): Record<NodeStatus, number> {
  const counts: Record<NodeStatus, number> = {
    [NodeStatus.PENDING]: 0,
    [NodeStatus.ACTIVE]: 0,
    [NodeStatus.RULED_OUT]: 0,
    [NodeStatus.CONFIRMED]: 0,
  };
  for (const node of nodes) {
    if (isNodeStatus(node.status)) {
      counts[node.status]++;
    }
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

export function countResolutionsByStatus(resolutions: ResolutionItem[]): Record<string, number> {
  const counts: Record<string, number> = {
    'Open': 0,
    'In Progress': 0,
    'On Hold': 0,
    'Implemented': 0,
    'Verified': 0,
    'Closed': 0,
  };
  for (const r of resolutions) {
    counts[r.status]++;
  }
  return counts;
}

export function getTreeStats(tree: SavedTree): TreeStats {
  const allNodes = flattenTree(applyInheritedRuleOut(tree.treeData));
  const causeNodes = allNodes.filter(n => n.type !== NodeType.ISSUE);
  const resolutions = tree.resolutions ?? [];
  return {
    totalNodes: allNodes.length,
    nodesByStatus: countNodesByStatus(causeNodes),
    actionsByStatus: countActionsByStatus(tree.actions),
    totalActions: tree.actions.length,
    totalNotes: tree.notes.length,
    totalEvidence: tree.notes.filter(n => n.isEvidence).length,
    confirmedCauses: causeNodes.filter(n => n.status === NodeStatus.CONFIRMED),
    rootCauses: causeNodes.filter(n => n.isRootCause === true && (!n.children || n.children.length === 0)),
    resolutionsByStatus: countResolutionsByStatus(resolutions),
    totalResolutions: resolutions.length,
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
