import { SavedTree, CauseNode, NodeStatus } from './types';
import { STATUS_COLORS } from './constants';
import { flattenTree, getTreeStats, formatDate } from './treeUtils';

const STATUS_LABELS: Record<NodeStatus, string> = {
  [NodeStatus.PENDING]: 'Pending',
  [NodeStatus.ACTIVE]: 'Active',
  [NodeStatus.RULED_OUT]: 'Ruled Out',
  [NodeStatus.CONFIRMED]: 'Confirmed',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status: string, colors: { bg: string; border: string; text: string }): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:500;background:${colors.bg};color:${colors.text};border:1px solid ${colors.border}">${escapeHtml(status)}</span>`;
}

function renderTreeHierarchy(node: CauseNode, notes: { referenceId: string; content: string; isEvidence: boolean }[], depth: number = 0): string {
  const colors = STATUS_COLORS[node.status];
  const indent = depth * 24;
  const nodeNotes = notes.filter(n => n.referenceId === node.id);

  let html = `
    <div style="margin-left:${indent}px;margin-bottom:12px;padding:10px 14px;border-left:3px solid ${colors.border};background:${colors.bg};border-radius:0 6px 6px 0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="width:10px;height:10px;border-radius:50%;background:${colors.border};display:inline-block;flex-shrink:0"></span>
        <strong style="color:${colors.text}">${escapeHtml(node.label)}</strong>
        <span style="font-size:11px;color:#64748b;text-transform:uppercase">${escapeHtml(node.type)}</span>
        ${statusBadge(STATUS_LABELS[node.status], colors)}
      </div>`;

  if (node.description) {
    html += `<div style="font-size:13px;color:#475569;margin-top:4px">${escapeHtml(node.description)}</div>`;
  }
  if (node.rationale) {
    html += `<div style="font-size:13px;color:#64748b;margin-top:4px;font-style:italic">Rationale: ${escapeHtml(node.rationale)}</div>`;
  }
  if (nodeNotes.length > 0) {
    html += `<div style="margin-top:6px">`;
    for (const note of nodeNotes) {
      const prefix = note.isEvidence
        ? `<span style="font-weight:600;color:#166534;font-size:11px;text-transform:uppercase">Evidence: </span>`
        : '';
      html += `<div style="font-size:12px;color:#64748b;margin-top:2px;padding:4px 8px;background:${note.isEvidence ? '#f0fdf4' : '#f8fafc'};border-radius:4px">${prefix}${escapeHtml(note.content)}</div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;

  if (node.children) {
    for (const child of node.children) {
      html += renderTreeHierarchy(child, notes, depth + 1);
    }
  }
  return html;
}

function renderActionsTable(tree: SavedTree): string {
  if (tree.actions.length === 0) {
    return '<p style="color:#94a3b8;font-style:italic">No action items recorded.</p>';
  }

  const allNodes = flattenTree(tree.treeData);
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));

  const actionStatusColors: Record<string, string> = {
    'Open': '#f97316',
    'In Progress': '#3b82f6',
    'Complete': '#22c55e',
    'Blocked': '#ef4444',
    'Closed': '#94a3b8',
  };

  let html = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f1f5f9;text-align:left">
          <th style="padding:8px 10px;border:1px solid #e2e8f0">Action</th>
          <th style="padding:8px 10px;border:1px solid #e2e8f0">Linked Cause</th>
          <th style="padding:8px 10px;border:1px solid #e2e8f0">Assignee</th>
          <th style="padding:8px 10px;border:1px solid #e2e8f0">Due Date</th>
          <th style="padding:8px 10px;border:1px solid #e2e8f0">Status</th>
        </tr>
      </thead>
      <tbody>`;

  for (let i = 0; i < tree.actions.length; i++) {
    const a = tree.actions[i];
    const causeNode = nodeMap.get(a.causeId);
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const statusColor = actionStatusColors[a.status] ?? '#64748b';

    html += `
      <tr style="background:${rowBg}">
        <td style="padding:8px 10px;border:1px solid #e2e8f0">
          <div>${escapeHtml(a.action)}</div>
          ${a.rationale ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px">${escapeHtml(a.rationale)}</div>` : ''}
        </td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0">${causeNode ? escapeHtml(causeNode.label) : '—'}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0">${escapeHtml(a.assignee || '—')}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0">${a.dueDate || '—'}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0"><span style="color:${statusColor};font-weight:500">${escapeHtml(a.status)}</span></td>
      </tr>`;
  }

  html += `</tbody></table>`;
  return html;
}

function renderStatGrid(label: string, counts: Record<string, number>, colorMap: Record<string, { bg: string; border: string; text: string }>): string {
  let html = `<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:600;color:#475569;margin-bottom:6px">${escapeHtml(label)}</div><div style="display:flex;gap:8px;flex-wrap:wrap">`;
  for (const [key, count] of Object.entries(counts)) {
    const colors = colorMap[key] ?? { bg: '#f8fafc', border: '#cbd5e1', text: '#334155' };
    html += `<div style="padding:8px 14px;border-radius:8px;background:${colors.bg};border:1px solid ${colors.border};text-align:center;min-width:80px">
      <div style="font-size:20px;font-weight:700;color:${colors.text}">${count}</div>
      <div style="font-size:11px;color:${colors.text}">${escapeHtml(key)}</div>
    </div>`;
  }
  html += `</div></div>`;
  return html;
}

function renderInvestigation(tree: SavedTree, headingTag: 'h1' | 'h2' = 'h1', anchorId?: string): string {
  const stats = getTreeStats(tree);
  const rootColors = STATUS_COLORS[tree.treeData.status];

  const actionColorMap: Record<string, { bg: string; border: string; text: string }> = {
    'Open': { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
    'In Progress': { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    'Complete': { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    'Blocked': { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    'Closed': { bg: '#f8fafc', border: '#94a3b8', text: '#475569' },
  };

  const nodeStatusDisplay: Record<string, { bg: string; border: string; text: string }> = {};
  for (const s of Object.values(NodeStatus)) {
    nodeStatusDisplay[STATUS_LABELS[s]] = STATUS_COLORS[s];
  }
  const nodeCountsDisplay: Record<string, number> = {};
  for (const [s, count] of Object.entries(stats.nodesByStatus)) {
    nodeCountsDisplay[STATUS_LABELS[s as NodeStatus]] = count;
  }

  let html = '';
  if (anchorId) html += `<div id="${anchorId}"></div>`;

  html += `
    <${headingTag} style="color:#1e293b;margin-bottom:4px">${escapeHtml(tree.name)}</${headingTag}>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;color:#64748b;font-size:13px">
      <span style="width:10px;height:10px;border-radius:50%;background:${rootColors.border};display:inline-block"></span>
      <span>Root status: ${STATUS_LABELS[tree.treeData.status]}</span>
      <span>|</span>
      <span>Created: ${formatDate(tree.createdAt)}</span>
      <span>|</span>
      <span>Updated: ${formatDate(tree.updatedAt)}</span>
    </div>`;

  // Summary stats
  html += `<h3 style="color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:6px">Executive Summary</h3>`;
  html += renderStatGrid('Nodes by Status', nodeCountsDisplay, nodeStatusDisplay);
  html += renderStatGrid('Actions by Status', stats.actionsByStatus, actionColorMap);

  // Confirmed root causes
  if (stats.confirmedCauses.length > 0) {
    html += `<div style="margin-bottom:16px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px">
      <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:6px">Confirmed Root Causes</div>
      <ul style="margin:0;padding-left:20px">`;
    for (const cause of stats.confirmedCauses) {
      html += `<li style="margin-bottom:4px;color:#991b1b">
        <strong>${escapeHtml(cause.label)}</strong>
        ${cause.description ? `<span style="color:#64748b"> — ${escapeHtml(cause.description)}</span>` : ''}
      </li>`;
    }
    html += `</ul></div>`;
  }

  // Detail appendix
  html += `<h3 style="color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:24px">Fault Tree Hierarchy</h3>`;
  html += renderTreeHierarchy(tree.treeData, tree.notes);

  html += `<h3 style="color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:24px">Action Items (${tree.actions.length})</h3>`;
  html += renderActionsTable(tree);

  return html;
}

function wrapInHtmlPage(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      max-width: 1000px;
      margin: 0 auto;
      padding: 32px 24px;
      background: #ffffff;
      line-height: 1.5;
    }
    h1 { font-size: 24px; margin-top: 0; }
    h2 { font-size: 20px; margin-top: 32px; }
    h3 { font-size: 15px; margin-top: 20px; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    @media print {
      body { padding: 0; max-width: 100%; }
      @page { margin: 1.5cm; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  ${bodyContent}
  <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
    Generated by RCCA Helper on ${formatDate(new Date().toISOString())}
  </div>
</body>
</html>`;
}

export function generateSingleReport(tree: SavedTree): string {
  return wrapInHtmlPage(
    `RCCA Report — ${tree.name}`,
    renderInvestigation(tree, 'h1')
  );
}

export function generateBulkReport(trees: SavedTree[]): string {
  let body = `<h1 style="color:#1e293b">RCCA Investigations Report</h1>`;
  body += `<p style="color:#64748b;font-size:13px">${trees.length} investigation(s) | Generated ${formatDate(new Date().toISOString())}</p>`;

  // Table of contents
  body += `<div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
    <div style="font-size:13px;font-weight:600;color:#475569;margin-bottom:8px">Table of Contents</div>
    <ol style="margin:0;padding-left:20px">`;
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    const rootColors = STATUS_COLORS[t.treeData.status];
    body += `<li style="margin-bottom:4px">
      <a href="#inv-${i}" style="color:#4f46e5;text-decoration:none">
        <span style="width:8px;height:8px;border-radius:50%;background:${rootColors.border};display:inline-block;margin-right:4px"></span>
        ${escapeHtml(t.name)}
      </a>
    </li>`;
  }
  body += `</ol></div>`;

  // Each investigation
  for (let i = 0; i < trees.length; i++) {
    body += `<div class="${i > 0 ? 'page-break' : ''}">`;
    body += renderInvestigation(trees[i], 'h2', `inv-${i}`);
    body += `</div>`;
  }

  return wrapInHtmlPage('RCCA Investigations Report', body);
}

export function openReportInNewTab(html: string): void {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}
