import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CauseNode, ActionItem, NodeStatus } from '../types';
import { CARD_WIDTH, CARD_HEIGHT, STATUS_COLORS } from '../constants';
import { Plus, Move, ClipboardList, Crosshair } from 'lucide-react';

interface TreeVisualizerProps {
  data: CauseNode;
  selectedId: string | null;
  actions: ActionItem[];
  onSelectNode: (node: CauseNode) => void;
  onAddNode: (parentId: string) => void;
}

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  data,
  selectedId,
  actions,
  onSelectNode,
  onAddNode
}) => {
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

  // Process data with D3
  const { nodes, links } = useMemo(() => {
    // Create hierarchy
    const root = d3.hierarchy(data);

    // Set tree layout settings
    const treeLayout = d3.tree<CauseNode>()
      .nodeSize([CARD_WIDTH + 40, CARD_HEIGHT + 80]); // Spacing between nodes

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
      </div>

      <svg ref={svgRef} className="w-full h-full">
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Links — colored by target node status */}
          {links.map((link) => {
            const targetStatus = link.target.data.status;
            const lineColor = STATUS_COLORS[targetStatus].border;

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
            const styles = STATUS_COLORS[node.data.status];
            const isSelected = node.data.id === selectedId;
            const hasActions = nodesWithActions.has(node.data.id);

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
                    borderColor: isSelected ? '#6366f1' : (node.data.isRootCause ? '#f59e0b' : styles.border),
                    color: styles.text,
                    boxShadow: node.data.isRootCause ? '0 0 0 2px rgba(245,158,11,0.3)' : undefined,
                  }}
                >
                  {/* Status Indicator Dot */}
                  <div className={`absolute -top-2 -right-2 w-4 h-4 rounded-full border border-white shadow-sm
                      ${node.data.status === NodeStatus.CONFIRMED ? 'bg-red-500' :
                        node.data.status === NodeStatus.RULED_OUT ? 'bg-green-500' :
                        node.data.status === NodeStatus.ACTIVE ? 'bg-orange-500' : 'bg-slate-300'}
                  `}/>

                  {/* Action indicator badge */}
                  {hasActions && (
                    <div
                      className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-indigo-500 border border-white shadow-sm flex items-center justify-center"
                      title="Has actions assigned"
                    >
                      <ClipboardList size={10} className="text-white" />
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-sm truncate" title={node.data.label}>
                      {node.data.label}
                    </h3>
                    <p className="text-xs opacity-80 mt-1 line-clamp-2">
                      {node.data.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                     <span className="text-[10px] font-mono opacity-50 uppercase tracking-wider">
                        {node.data.type}
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
                  {node.data.isRootCause && (
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
