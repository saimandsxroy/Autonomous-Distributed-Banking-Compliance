import { useMemo } from "react";
import { ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";

export function AmlGraphVisualizer({
  analysis,
  loading = false,
  onRefresh,
  title = "5-Hop Recursive Money-Flow Subgraph",
}) {
  // Compute positions of nodes in circular/layout arrangement
  const { nodePositions, edgesToRender } = useMemo(() => {
    if (!analysis) {
      return { nodePositions: [], edgesToRender: [] };
    }

    // Default demo ring nodes if graph nodes are empty
    let nodes = analysis.nodes || [];
    let edges = analysis.edges || [];

    if (nodes.length === 0) {
      nodes = [
        { id: 1, label: "Alice (#1)", balance: 4250, status: "ACTIVE" },
        { id: 2, label: "Bob (#2)", balance: 2635, status: "ACTIVE" },
        { id: 3, label: "Charlie (#3)", balance: 95, status: "FROZEN_AML" },
      ];
      edges = [
        { source: 1, target: 2, amount: 120, label: "$120.00" },
        { source: 2, target: 3, amount: 110, label: "$110.00" },
        { source: 3, target: 1, amount: 100, label: "$100.00 (Loop)" },
      ];
    }

    const width = 500;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const count = nodes.length;
    const positions = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return {
        ...n,
        x,
        y,
        isFocus: n.id === analysis.accountId,
      };
    });

    const posMap = new Map();
    positions.forEach((p) => posMap.set(p.id, { x: p.x, y: p.y }));

    const resolvedEdges = edges.map((e, idx) => {
      const s = posMap.get(e.source) || { x: centerX - 80, y: centerY };
      const t = posMap.get(e.target) || { x: centerX + 80, y: centerY };
      return {
        ...e,
        idx,
        x1: s.x,
        y1: s.y,
        x2: t.x,
        y2: t.y,
      };
    });

    return { nodePositions: positions, edgesToRender: resolvedEdges };
  }, [analysis]);

  const isCycle = analysis?.cycleDetected ?? true;
  const risk = analysis?.riskLevel ?? (isCycle ? "CRITICAL" : "LOW");

  return (
    <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header bar */}
      <div className="px-5 py-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded-md ${
              isCycle
                ? "bg-rose-950 text-rose-400 border border-rose-800"
                : "bg-emerald-950 text-emerald-400"
            }`}
          >
            {isCycle ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
              {title}
            </h4>
            <p className="text-[11px] text-zinc-500 font-mono">
              MySQL 8.0 Recursive CTE • Max 5 Transitive Hops
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              risk === "CRITICAL"
                ? "bg-rose-950/80 text-rose-300 border-rose-700 animate-pulse"
                : risk === "HIGH"
                  ? "bg-amber-950/80 text-amber-300 border-amber-700"
                  : "bg-emerald-950/80 text-emerald-300 border-emerald-700"
            }`}
          >
            {isCycle ? "CYCLE DETECTED" : "LINEAR FLOW"}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-1 text-zinc-400 hover:text-white transition-colors ${loading ? "animate-spin" : ""}`}
              title="Refresh Graph"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-72 bg-gradient-to-b from-zinc-950 to-zinc-900/60 flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs font-mono">
            <RefreshCw size={24} className="animate-spin text-ochre-800" />
            <span>Traversing 5-hop graph recursive CTE...</span>
          </div>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 500 300">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#e11d48" />
              </marker>
              <marker
                id="arrow-cyan"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
              </marker>
            </defs>

            {/* Edge paths */}
            {edgesToRender.map((edge) => {
              // Calculate curved quadratic bezier path
              const dx = edge.x2 - edge.x1;
              const dy = edge.y2 - edge.y1;
              const cx = (edge.x1 + edge.x2) / 2 - dy * 0.2;
              const cy = (edge.y1 + edge.y2) / 2 + dx * 0.2;
              const pathData = `M ${edge.x1} ${edge.y1} Q ${cx} ${cy} ${edge.x2} ${edge.y2}`;

              return (
                <g key={`edge-${edge.idx}`}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isCycle ? "#e11d48" : "#06b6d4"}
                    strokeWidth={isCycle ? "2.5" : "1.8"}
                    strokeDasharray={isCycle ? "5 3" : "none"}
                    markerEnd={isCycle ? "url(#arrow)" : "url(#arrow-cyan)"}
                    className={
                      isCycle ? "animate-pulse opacity-90" : "opacity-75"
                    }
                  />
                  {/* Flow label */}
                  {edge.label && (
                    <text
                      x={cx}
                      y={cy}
                      fill={isCycle ? "#fca5a5" : "#67e8f9"}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodePositions.map((node) => {
              const isFrozen = node.status === "FROZEN_AML";
              const strokeColor = isFrozen
                ? "#e11d48"
                : node.isFocus
                  ? "#f59e0b"
                  : "#10b981";
              const fillBg = isFrozen
                ? "#4c0519"
                : node.isFocus
                  ? "#451a03"
                  : "#064e3b";

              return (
                <g
                  key={`node-${node.id}`}
                  className="transition-transform duration-300"
                >
                  {/* Outer pulse ring */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={22}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    className="opacity-40 animate-ping"
                  />
                  {/* Main Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={18}
                    fill={fillBg}
                    stroke={strokeColor}
                    strokeWidth="2.5"
                  />
                  {/* Node ID label */}
                  <text
                    x={node.x}
                    y={node.y + 4}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="900"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    #{node.id}
                  </text>
                  {/* Node Name/Status caption */}
                  <text
                    x={node.x}
                    y={node.y + 30}
                    fill={isFrozen ? "#fda4af" : "#94a3b8"}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {node.label || `Account #${node.id}`}
                  </text>
                  {isFrozen && (
                    <text
                      x={node.x}
                      y={node.y + 41}
                      fill="#f43f5e"
                      fontSize="8"
                      fontWeight="black"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      [FROZEN_AML]
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Graph telemetry footer */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800 bg-zinc-900 border-t border-zinc-800 text-[11px] font-mono py-2.5 px-4 text-zinc-400">
        <div>
          <span className="text-zinc-500 uppercase tracking-wider block text-[9px]">
            24h Fan-Out
          </span>
          <span className="font-bold text-zinc-200">
            {analysis?.fanOutCount24h ?? 2} counterparties
          </span>
        </div>
        <div className="px-3">
          <span className="text-zinc-500 uppercase tracking-wider block text-[9px]">
            24h Fan-In
          </span>
          <span className="font-bold text-zinc-200">
            {analysis?.fanInCount24h ?? 1} counterparties
          </span>
        </div>
        <div className="pl-3">
          <span className="text-zinc-500 uppercase tracking-wider block text-[9px]">
            Cycle Status
          </span>
          <span
            className={`font-bold ${
              isCycle ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {isCycle ? "FATF Rec 16 Triggered" : "No Transitive Cycles"}
          </span>
        </div>
      </div>
    </div>
  );
}

