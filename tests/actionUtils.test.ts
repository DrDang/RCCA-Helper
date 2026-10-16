import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addInvestigationAction, getAssigneeNames, getLocalDate, isActionOverdue } from '../actionUtils';
import { applyInheritedRuleOut, flattenTree } from '../treeUtils';
import { ActionItem, IssueStatus, NodeStatus, NodeType, SavedTree } from '../types';

const action: ActionItem = {
  id: 'task', causeId: 'cause', action: 'Check cause', rationale: '',
  assignee: 'Alex', assignedDate: '2026-10-15', dueDate: '', status: 'Open',
};

test('task dates use the local calendar day, including late evening', () => {
  assert.equal(getLocalDate(new Date(2026, 9, 15, 23, 59)), '2026-10-15');
  assert.equal(getLocalDate(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
});

test('tasks due today are not overdue, and finished tasks are excluded', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  assert.equal(isActionOverdue(getLocalDate(), 'Open'), false);
  assert.equal(isActionOverdue(getLocalDate(yesterday), 'Open'), true);
  assert.equal(isActionOverdue(getLocalDate(yesterday), 'Complete'), false);
  assert.equal(isActionOverdue(getLocalDate(yesterday), 'Closed'), false);
  assert.equal(isActionOverdue('', 'Open'), false);
});

function fixture(status = NodeStatus.PENDING): SavedTree {
  return {
    id: 'tree', name: 'Investigation', createdAt: '', updatedAt: '',
    actions: [], notes: [], resolutions: [],
    treeData: {
      id: 'issue', parentId: null, label: 'Issue', description: '', rationale: '',
      type: NodeType.ISSUE, status: IssueStatus.OPEN,
      children: [{
        id: 'cause', parentId: 'issue', label: 'Cause', description: 'Keep description',
        rationale: 'Keep rationale', type: NodeType.CAUSE, status,
        isRootCause: status === NodeStatus.CONFIRMED,
      }],
    },
  };
}

for (const status of Object.values(NodeStatus)) {
  test(`adding a task activates a ${status} cause and preserves its records`, () => {
    const tree = fixture(status);
    tree.notes = [{ id: 'evidence', referenceId: 'cause', content: 'Evidence', owner: 'Alex', createdAt: '', isEvidence: true }];
    const before = JSON.stringify(tree);
    const result = addInvestigationAction(tree, action);
    assert.deepEqual(result.treeData.children![0], {
      ...tree.treeData.children![0], status: NodeStatus.ACTIVE, isRootCause: false,
    });
    assert.deepEqual(result.actions, [action]);
    assert.equal(result.notes, tree.notes);
    assert.equal(result.resolutions, tree.resolutions);
    assert.equal(result.treeData.status, IssueStatus.OPEN);
    assert.equal(JSON.stringify(tree), before);
  });
}

test('adding a task to an issue uses its lifecycle and clears resolved state', () => {
  const tree = fixture();
  tree.treeData.status = IssueStatus.RESOLVED;
  tree.isResolved = true;
  const result = addInvestigationAction(tree, { ...action, causeId: 'issue' });
  assert.equal(result.treeData.status, IssueStatus.INVESTIGATING);
  assert.equal(result.isResolved, false);
  assert.equal(result.treeData.children, tree.treeData.children);
});

test('reopens ruled-out ancestors so the target is effectively active', () => {
  const tree = fixture(NodeStatus.RULED_OUT);
  const parent = tree.treeData.children![0];
  parent.children = [{ ...parent, id: 'child', parentId: parent.id, children: undefined }];
  const result = addInvestigationAction(tree, { ...action, causeId: 'child' });
  const displayed = flattenTree(applyInheritedRuleOut(result.treeData));
  assert.equal(displayed.find(node => node.id === 'child')!.status, NodeStatus.ACTIVE);
  assert.equal(displayed.find(node => node.id === 'cause')!.status, NodeStatus.ACTIVE);
});

test('an unmatched task does not alter node statuses', () => {
  const tree = fixture();
  assert.equal(addInvestigationAction(tree, { ...action, causeId: 'missing' }).treeData, tree.treeData);
});

test('assignee suggestions span supplied investigations, trim, deduplicate and exclude placeholders', () => {
  const first = fixture();
  first.actions = [' Zoe ', 'alex', 'Unassigned', '', '  '].map(assignee => ({ ...action, assignee }));
  const second = fixture();
  second.actions = ['Alex', 'Blair', ' unassigned '].map(assignee => ({ ...action, assignee }));
  second.resolutions = [{
    id: 'resolution', linkedCauseIds: [], title: '', description: '', owner: 'Casey',
    targetDate: '', implementedDate: '', verificationMethod: '', verificationResults: '',
    verifiedDate: '', status: 'Open', createdAt: '', updatedAt: '',
  }];
  assert.deepEqual(getAssigneeNames([first, second]), ['alex', 'Blair', 'Casey', 'Zoe']);
  assert.deepEqual(getAssigneeNames([]), []);
});
