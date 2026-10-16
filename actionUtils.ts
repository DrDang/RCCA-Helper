import { ActionItem, CauseNode, IssueStatus, NodeStatus, NodeType, SavedTree } from './types';

export function getLocalDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isActionOverdue(dueDate: string, status: string): boolean {
  return Boolean(dueDate) && status !== 'Complete' && status !== 'Closed' && dueDate < getLocalDate();
}

export function getAssigneeNames(trees: SavedTree[]): string[] {
  const names = new Map<string, string>();
  for (const tree of trees) {
    const candidates = [
      ...tree.actions.map(action => action.assignee),
      ...(tree.resolutions ?? []).map(resolution => resolution.owner),
    ];
    for (const candidate of candidates) {
      const name = candidate.trim();
      const key = name.toLowerCase();
      if (name && key !== 'unassigned' && !names.has(key)) names.set(key, name);
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

export function addInvestigationAction(tree: SavedTree, action: ActionItem): SavedTree {
  const activate = (node: CauseNode): CauseNode => ({
    ...node,
    status: node.type === NodeType.ISSUE ? IssueStatus.INVESTIGATING : NodeStatus.ACTIVE,
    isRootCause: false,
  });
  const visit = (node: CauseNode): CauseNode => {
    if (node.id === action.causeId) return activate(node);
    const children = node.children?.map(visit);
    if (!children?.some((child, index) => child !== node.children![index])) return node;
    // Reopen excluded ancestors so the task's node is visibly active.
    return {
      ...(node.status === NodeStatus.RULED_OUT ? activate(node) : node),
      children,
    };
  };
  const treeData = visit(tree.treeData);
  return {
    ...tree,
    treeData,
    actions: [...tree.actions, action],
    isResolved: action.causeId === tree.treeData.id ? false : tree.isResolved,
  };
}
