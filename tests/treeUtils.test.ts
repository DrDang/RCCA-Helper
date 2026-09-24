import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flattenTree, getReparentError, reparentNode, applyInheritedRuleOut } from '../treeUtils';
import { CauseNode, IssueStatus, NodeStatus, NodeType } from '../types';

const cause = (id: string, parentId: string | null, children: CauseNode[] = []): CauseNode => ({
  id, parentId, children, label: id, description: `Description of ${id}`,
  rationale: 'Keep this rationale', status: NodeStatus.CONFIRMED, type: NodeType.CAUSE,
});

function fixture() {
  return {
    ...cause('root', null, [cause('a', 'root', [cause('leaf', 'a')]), cause('b', 'root')]),
    type: NodeType.ISSUE, status: IssueStatus.INVESTIGATING,
  };
}

test('moves a whole branch immutably and preserves node identity, content and child links', () => {
  const root = fixture();
  const before = JSON.stringify(root);
  const result = reparentNode(root, 'a', 'b');
  assert.equal(JSON.stringify(root), before);
  assert.deepEqual(result.children?.map(node => node.id), ['b']);
  const moved = result.children![0].children![0];
  assert.deepEqual(moved, { ...root.children![0], parentId: 'b' });
  assert.equal(moved.children![0], root.children![0].children![0]);
  assert.deepEqual(flattenTree(result).map(node => node.id).sort(), ['a', 'b', 'leaf', 'root']);
});

test('can move to an ancestor and append without disturbing siblings', () => {
  const root = fixture();
  const result = reparentNode(root, 'leaf', 'root');
  assert.deepEqual(result.children!.map(node => node.id), ['a', 'b', 'leaf']);
  assert.deepEqual(result.children![0].children, []);
  assert.equal(result.children![2].parentId, 'root');
});

for (const [node, parent] of [
  ['root', 'a'], ['a', 'a'], ['a', 'leaf'], ['a', 'root'], ['missing', 'b'], ['a', 'missing'],
]) {
  test(`rejects invalid move ${node} → ${parent} without changing the tree`, () => {
    const root = fixture();
    assert.ok(getReparentError(root, node, parent));
    assert.equal(reparentNode(root, node, parent), root);
  });
}

test('handles a parent with no children array and clears its leaf-only root-cause marker', () => {
  const root = fixture();
  root.children![1].children = undefined;
  root.children![1].isRootCause = true;
  const result = reparentNode(root, 'a', 'b');
  assert.equal(result.children![0].isRootCause, false);
  assert.equal(result.children![0].children![0].id, 'a');
  assert.equal(root.children![1].isRootCause, true);
});

test('inherited rule-out follows the new ancestry without overwriting stored statuses', () => {
  const root = fixture();
  root.children![1].status = NodeStatus.RULED_OUT;
  const moved = reparentNode(root, 'a', 'b');
  const displayed = flattenTree(applyInheritedRuleOut(moved));
  assert.equal(displayed.find(node => node.id === 'leaf')!.status, NodeStatus.RULED_OUT);
  assert.equal(flattenTree(moved).find(node => node.id === 'leaf')!.status, NodeStatus.CONFIRMED);
  const restored = reparentNode(moved, 'a', 'root');
  assert.equal(flattenTree(applyInheritedRuleOut(restored)).find(node => node.id === 'leaf')!.status, NodeStatus.CONFIRMED);
});
