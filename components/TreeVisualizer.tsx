import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { CauseNode, ActionItem, IssueStatus, NodeStatus, NodeType, Note, ResolutionItem } from '../types';
import { CARD_WIDTH, CARD_HEIGHT, getNodeStatusColors } from '../constants';
import { Plus, Move, ClipboardList, Crosshair, Shield, Download, StickyNote, AlertTriangle } from 'lucide-react';
import { useAppDialog } from './AppDialog';

interface TreeVisualizerProps {
  data: CauseNode;
  selectedId: string | null;
  actions: ActionItem[];
  resolutions: ResolutionItem[];
  notes: Note[];
  treeName?: string;
  onSelectNode: (node: CauseNode) => void;
  onShowNodeNotes: (node: CauseNode) => void;
  onAddNode: (parentId: string) => void;
}

const getNodeTypeLabel = (node: CauseNode, isExcluded: boolean = false): string => {
  if (isExcluded) return 'Excluded by Ruled-Out Parent';
  if (node.type === NodeType.ISSUE) return 'Issue';
  if (node.status === NodeStatus.CONFIRMED) return 'Confirmed Cause';
  if (node.status === NodeStatus.RULED_OUT) return 'Ruled Out Potential Cause';
  return 'Potential Cause';
};

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  data,
  selectedId,
  actions,
  resolutions,
  notes,
  treeName = 'fault-tree',
  onSelectNode,
  onShowNodeNotes,
  onAddNode
}) => {
  const { showAlert } = useAppDialog();
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Build a set of node IDs that have actions for quick lookup
  const nodesWithActions = useMemo(() => {
    const set = new Set<string>();
    for (const action of actions) {
      set.add(action.causeId);
    }
    return set;
  }, [actions]);

  // Build a set of node IDs that have resolutions linked
  const nodesWithResolutions = useMemo(() => {
    const set = new Set<string>();
    for (const resolution of resolutions) {
      for (const causeId of resolution.linkedCauseIds) {
        set.add(causeId);
      }
    }
    return set;
  }, [resolutions]);

  // Group evidence notes by cause so ruled-out reasons are available from the tree.
  const evidenceNotesByNode = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const note of notes) {
      if (!note.isEvidence) continue;
      const existing = map.get(note.referenceId) ?? [];
      existing.push(note);
      map.set(note.referenceId, existing);
    }
    return map;
  }, [notes]);

  // Process data with D3
  const { nodes, links } = useMemo(() => {
    // Create hierarchy
    const root = d3.hierarchy(data);

    // Set tree layout settings
    const treeLayout = d3.tree<CauseNode>()
      .nodeSize([CARD_WIDTH + 40, CARD_HEIGHT + 80])
      // Keep neighboring cards evenly spaced, including across subtree boundaries.
      .separation(() => 1);

    treeLayout(root);

    return {
      nodes: root.descendants(),
      links: root.links()
    };
  }, [data]);

  // Setup Zoom/Pan
  useEffect(() => {
    if (!svgRef.current) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        setTransform(event.transform);
      });

    zoomRef.current = zoom;
    d3.select(svgRef.current).call(zoom);

    // Center initial view roughly
    if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const initialX = width / 2 - (CARD_WIDTH / 2);
        const initialY = 50;
        d3.select(svgRef.current).call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY).scale(0.8));
    }

  }, []); // Run once on mount

  // Keep the selected card visible when the inspector opens or changes width.
  useEffect(() => {
    if (!selectedId || !svgRef.current || !containerRef.current || !zoomRef.current) return;

    const selectedNode = nodes.find(node => node.data.id === selectedId);
    if (!selectedNode) return;

    const svg = svgRef.current;
    const container = containerRef.current;
    const zoom = zoomRef.current;
    let animationFrame: number | null = null;

    const keepSelectedNodeVisible = () => {
      const { width } = container.getBoundingClientRect();
      const currentTransform = d3.zoomTransform(svg);
      const margin = 32;
      const nodeLeft = currentTransform.applyX(selectedNode.x);
      const nodeRight = currentTransform.applyX(selectedNode.x + CARD_WIDTH);
      let shiftX = 0;

      if (nodeRight > width - margin) {
        shiftX = width - margin - nodeRight;
      } else if (nodeLeft < margin) {
        shiftX = margin - nodeLeft;
      }

      if (Math.abs(shiftX) < 1) return;

      const nextTransform = d3.zoomIdentity
        .translate(currentTransform.x + shiftX, currentTransform.y)
        .scale(currentTransform.k);

      d3.select(svg)
        .transition()
        .duration(250)
        .call(zoom.transform, nextTransform);
    };

    const scheduleVisibilityCheck = () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(keepSelectedNodeVisible);
    };

    scheduleVisibilityCheck();
    const resizeObserver = new ResizeObserver(scheduleVisibilityCheck);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    };
  }, [selectedId, nodes]);

  // Re-center the tree view
  const handleRecenter = () => {
    if (!svgRef.current || !containerRef.current || !zoomRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const initialX = width / 2 - (CARD_WIDTH / 2);
    const initialY = 50;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(initialX, initialY).scale(0.8));
  };

  // Export tree as PNG image
  const [isExporting, setIsExporting] = useState(false);

  const handleExportImage = async () => {
    if (!containerRef.current || isExporting) return;

    setIsExporting(true);

    try {
      // Hide the toolbar buttons during capture
      const toolbar = containerRef.current.querySelector('.absolute.top-4.left-4') as HTMLElement;
      if (toolbar) toolbar.style.display = 'none';

      // Capture the visible container
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#f8fafc',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Restore toolbar
      if (toolbar) toolbar.style.display = 'flex';

      // Download the image
      const link = document.createElement('a');
      link.download = `${treeName.replace(/[^a-z0-9]/gi, '_')}_tree.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to export image:', error);
      await showAlert('Failed to export image. Please try again.', 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Render Logic using curved paths for standard tree look
  const generatePath = (link: d3.HierarchyLink<CauseNode>) => {
    const sourceX = link.source.x + CARD_WIDTH / 2;
    const sourceY = link.source.y + CARD_HEIGHT;
    const targetX = link.target.x + CARD_WIDTH / 2;
    const targetY = link.target.y;

    return `M${sourceX},${sourceY}
            C${sourceX},${(sourceY + targetY) / 2}
             ${targetX},${(sourceY + targetY) / 2}
             ${targetX},${targetY}`;
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative cursor-move" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="backdrop-blur p-2 rounded shadow text-xs" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-tertiary)', opacity: 0.8 }}>
          <div className="flex items-center gap-2"><Move size={14} /> Pan & Zoom</div>
        </div>
        <button
          onClick={handleRecenter}
          className="backdrop-blur p-2 rounded shadow text-xs flex items-center gap-2 hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', opacity: 0.8 }}
          title="Re-center tree view"
        >
          <Crosshair size={14} /> Re-center
        </button>
        <button
          onClick={handleExportImage}
          disabled={isExporting}
          className="backdrop-blur p-2 rounded shadow text-xs flex items-center gap-2 hover:opacity-100 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-secondary)', opacity: 0.8 }}
          title="Export visible tree view as PNG (pan/zoom to frame first)"
        >
          <Download size={14} /> {isExporting ? 'Exporting...' : 'Export Image'}
        </button>
      </div>

      <svg ref={svgRef} className="w-full h-full">
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Links â€” colored by target node status */}
          {links.map((link) => {
            const isTargetExcluded = link.target.ancestors().slice(1).some(ancestor => ancestor.data.status === NodeStatus.RULED_OUT);
            const displayTarget = isTargetExcluded
              ? { ...link.target.data, status: NodeStatus.RULED_OUT, isRootCause: false }
              : link.target.data;
            const targetStatus = displayTarget.status;
            const lineColor = getNodeStatusColors(displayTarget).border;

            return (
              <path
                key={`${link.source.data.id}-${link.target.data.id}`}
                d={generatePath(link)}
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeOpacity={targetStatus === NodeStatus.PENDING ? 0.4 : 0.7}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const ruledOutAncestor = node.ancestors().slice(1).find(ancestor => ancestor.data.status === NodeStatus.RULED_OUT);
            const isExcluded = ruledOutAncestor !== undefined;
            const displayNode = isExcluded
              ? { ...node.data, status: NodeStatus.RULED_OUT, isRootCause: false }
              : node.data;
            const styles = getNodeStatusColors(displayNode);
            const isSelected = node.data.id === selectedId;
            const hasActions = nodesWithActions.has(node.data.id);
            const hasResolutions = nodesWithResolutions.has(node.data.id);
            const isLeafRootCause = !isExcluded && node.data.isRootCause === true && (!node.data.children || node.data.children.length === 0);
            const description = node.data.description.trim();
            const isDirectlyRuledOut = !isExcluded && node.data.type !== NodeType.ISSUE && node.data.status === NodeStatus.RULED_OUT;
            const evidenceNotes = evidenceNotesByNode.get(node.data.id) ?? [];
            const evidenceNote = evidenceNotes.find(note => note.content.trim().length > 0);
            const evidenceReason = evidenceNote?.content.trim() ?? '';
            const hasEvidenceReason = evidenceReason.length > 0;

            return (
              <foreignObject
                key={node.data.id}
                x={node.x}
                y={node.y}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                className="overflow-visible"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(node.data);
                  }}
                  className={`
                    w-full h-full rounded-lg shadow-sm border-2 p-3 flex flex-col justify-between transition-all duration-200
                    hover:shadow-md cursor-pointer relative group
                    ${isSelected ? 'ring-4 ring-indigo-500/30 translate-y-[-2px]' : ''}
                  `}
                  style={{
                    backgroundColor: styles.bg,
                    borderColor: isSelected ? '#6366f1' : (isLeafRootCause ? '#f59e0b' : styles.border),
                    borderStyle: isExcluded ? 'dashed' : 'solid',
                    color: styles.text,
                    boxShadow: isLeafRootCause ? '0 0 0 2px rgba(245,158,11,0.3)' : undefined,
                  }}
                >
                  {/* Status Indicator Dot */}
                  <div
                    className={`absolute -top-2 -right-2 w-4 h-4 rounded-full border border-white shadow-sm ${
                      node.data.type === NodeType.ISSUE
                        ? node.data.status === IssueStatus.RESOLVED
                          ? 'bg-green-500'
                          : node.data.status === IssueStatus.CLOSED
                            ? 'bg-slate-400'
                            : node.data.status === IssueStatus.OPEN
                              ? 'bg-blue-500'
                              : 'bg-orange-500'
                        : displayNode.status === NodeStatus.CONFIRMED
                          ? 'bg-red-500'
                          : displayNode.status === NodeStatus.RULED_OUT
                            ? 'bg-green-500'
                            : displayNode.status === NodeStatus.ACTIVE
                              ? 'bg-orange-500'
                              : 'bg-slate-300'
                    }`}
                  />

                  {/* Action indicator badge */}
                  {hasActions && (
                    <div
                      className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-indigo-500 border border-white shadow-sm flex items-center justify-center"
                      title="Has investigation actions"
                    >
                      <ClipboardList size={10} className="text-white" />
                    </div>
                  )}

                  {/* Resolution indicator badge */}
                  {hasResolutions && (
                    <div
                      className="absolute -top-2 w-5 h-5 rounded-full bg-emerald-500 border border-white shadow-sm flex items-center justify-center"
                      style={{ left: hasActions ? '18px' : '-8px' }}
                      title="Has corrective actions"
                    >
                      <Shield size={10} className="text-white" />
                    </div>
                  )}

                  {/* Ruled-out evidence badge with quick reason preview */}
                  {isDirectlyRuledOut && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowNodeNotes(node.data);
                      }}
                      className={`
                        group/evidence absolute -bottom-2 left-3 z-20 flex h-6 w-6 items-center justify-center
                        rounded-full border-2 border-white text-white shadow-md transition-transform
                        hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1
                        ${hasEvidenceReason ? 'bg-emerald-600 focus:ring-emerald-500' : 'bg-amber-500 focus:ring-amber-400'}
                      `}
                      aria-label={hasEvidenceReason
                        ? `View ruled-out evidence: ${evidenceReason}`
                        : 'View notes. No ruled-out reason has been entered.'}
                    >
                      {hasEvidenceReason ? <StickyNote size={12} /> : <AlertTriangle size={12} />}
                      <span
                        role="tooltip"
                        className="
                          pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-64
                          rounded-lg border p-3 text-left opacity-0 shadow-xl transition-opacity
                          group-hover/evidence:visible group-hover/evidence:opacity-100
                          group-focus-visible/evidence:visible group-focus-visible/evidence:opacity-100
                        "
                        style={{
                          backgroundColor: 'var(--color-surface-primary)',
                          borderColor: hasEvidenceReason ? 'var(--color-status-ruled-out-border)' : 'var(--color-status-pending-border)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: hasEvidenceReason ? 'var(--color-status-ruled-out-text)' : 'var(--color-status-pending-text)' }}>
                          {hasEvidenceReason ? 'Ruled-out evidence' : 'Reason missing'}
                        </span>
                        <span className="mt-1 block whitespace-normal text-xs font-normal leading-relaxed">
                          {hasEvidenceReason ? evidenceReason : 'This cause is ruled out, but no evidence reason has been entered.'}
                        </span>
                        {evidenceNote && (
                          <span className="mt-2 block text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>
                            {evidenceNote.owner} · {evidenceNote.createdAt}
                          </span>
                        )}
                        <span className="mt-2 block text-[10px] font-semibold text-indigo-500">
                          Click to open Notes{evidenceNotes.length > 1 ? ` (${evidenceNotes.length} evidence notes)` : ''}
                        </span>
                      </span>
                    </button>
                  )}

                  <div className="min-h-0 flex-1 overflow-hidden">
                    <h3 className="font-bold text-sm leading-tight" style={{ wordBreak: 'break-word' }}>
                      {node.data.label}
                    </h3>
                    {description && (
                      <p className="text-xs opacity-80 mt-1 line-clamp-2">
                        {description}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-2">
                     <span className="text-[10px] font-mono opacity-50 uppercase tracking-wider">
                        {getNodeTypeLabel(node.data, isExcluded)}
                     </span>

                     {/* Quick Add Child Button - visible on hover or selection */}
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddNode(node.data.id);
                        }}
                        className={`
                            p-1 rounded shadow-sm
                            opacity-0 group-hover:opacity-100 transition-opacity
                            ${isSelected ? 'opacity-100' : ''}
                        `}
                        style={{
                            backgroundColor: 'var(--color-surface-primary)',
                            borderColor: 'var(--color-border-primary)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border-primary)',
                        }}
                        title="Add Child Cause"
                     >
                        <Plus size={14} />
                     </button>
                  </div>

                  {/* Root Cause badge */}
                  {isLeafRootCause && (
                    <div
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 border border-white shadow-sm"
                      title="Root Cause"
                    >
                      <span className="text-[9px] font-bold text-white uppercase tracking-wider whitespace-nowrap">Root Cause</span>
                    </div>
                  )}
                </div>
              </foreignObject>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
