import { useMemo } from "react";
import { ShieldAlert, CheckCircle2, RefreshCw, Info } from "lucide-react";

export function AmlGraphVisualizer({
  analysis,
  loading = false,
  onRefresh,
  title = "5-Hop Recursive Money-Flow Subgraph",
}) {
  // Compute positions of nodes in circular dynamic arrangement
  const { nodePositions, edgesToRender, hasData } = useMemo(() => {
    if (!analysis) {
      return { nodePositions: [], edgesToRender: [], hasData: false };
    }

    const rawNodes = analysis.nodes || [];
    const rawEdges = analysis.edges || [];

    if (rawNodes.length === 0 && rawEdges.length === 0) {
      return { nodePositions: [], edgesToRender: [], hasData: false };
    }

    const width = 560;
    const height = 340;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Normalize nodes extracting id, label, balance, status
    const nodes = rawNodes.map((n) => {
      const id = n.id ?? n.accountId;
      const ownerLabel = n.ownerName || n.label;
      const accountNum = n.accountNumber ? `(${n.accountNumber})` : "";
      return {
        id,
        label: ownerLabel ? `${ownerLabel} ${accountNum}`.trim() : `Account #${id}`,
        balance: n.balance != null ? Number(n.balance) : null,
        status: n.status || "ACTIVE",
        isOrigin: Boolean(n.isOrigin || (id === analysis.accountId)),
      };
    });

    const count = nodes.length;
    const positions = nodes.map((n, i) => {
      if (count === 1) {
        return {
          ...n,
          x: centerX,
          y: centerY,
          isFocus: true,
        };
      }
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return {
        ...n,
        x,
        y,
        isFocus: n.id === analysis.accountId || n.isOrigin,
      };
    });

    const posMap = new Map();
    positions.forEach((p) => posMap.set(p.id, { x: p.x, y: p.y }));

    // Normalize edges extracting source, target, amount, label, isCycle
    const cyclePaths = analysis.cyclePaths || [];
    const resolvedEdges = rawEdges
      .map((e, idx) => {
        const sourceId = e.source ?? e.from ?? e.sourceAccountId;
        const targetId = e.target ?? e.to ?? e.destinationAccountId;
        const s = posMap.get(sourceId);
        const t = posMap.get(targetId);

        if (!s || !t) return null;

        const amount = e.amount != null ? Number(e.amount) : 0;
        const isCycleEdge = Boolean(
          e.isCycle ||
            cyclePaths.some((p) => p && p.includes(`${sourceId}->${targetId}`))
        );

        let labelText = e.label;
        if (!labelText && amount > 0) {
          labelText = `$${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
          if (isCycleEdge) {
            labelText += " (Loop)";
          }
        }

        return {
          idx,
          source: sourceId,
          target: targetId,
          amount,
          label: labelText,
          isCycle: isCycleEdge,
          x1: s.x,
          y1: s.y,
          x2: t.x,
          y2: t.y,
        };
      })
      .filter(Boolean);

    return {
      nodePositions: positions,
      edgesToRender: resolvedEdges,
      hasData: positions.length > 0,
    };
  }, [analysis]);

  const isCycle = Boolean(analysis?.cycleDetected);
  const risk =
    analysis?.riskLevel ??
    (isCycle ? "CRITICAL" : (analysis?.fanOutCount24h || 0) > 3 ? "HIGH" : "LOW");

  return (
    <div className="bg-[#0C1017]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl flex flex-col relative">
      {/* Top Laser Accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8]/60 to-transparent" />

      {/* Header bar */}
      <div className="px-5 py-4 bg-[#0C1017] border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              isCycle
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {isCycle ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-[-0.02em] text-[#F3F1EC]">
              {title}
            </h4>
            <p className="text-[11px] text-[#6E737D] font-mono mt-0.5">
              MySQL 8.0 Recursive CTE • Max 5 Transitive Hops
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${
              risk === "CRITICAL"
                ? "bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse"
                : risk === "HIGH"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {isCycle ? "CYCLE DETECTED" : "LINEAR FLOW"}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-1.5 rounded-lg text-[#8E929B] hover:text-white hover:bg-white/[0.06] transition-colors ${loading ? "animate-spin text-[#38BDF8]" : ""}`}
              title="Refresh Graph from MySQL"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-80 bg-[#06080C] flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-[#8E929B] text-xs font-mono">
            <RefreshCw size={24} className="animate-spin text-[#38BDF8]" />
            <span>Traversing recursive CTE money trail...</span>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center p-6">
            <div className="p-3 bg-white/[0.04] rounded-2xl border border-white/10 text-[#6E737D]">
              <Info size={24} />
            </div>
            <p className="text-xs font-mono font-semibold text-[#F3F1EC] uppercase tracking-wider">
              No Money-Flow Edges Detected
            </p>
            <p className="text-[11px] text-[#6E737D] font-mono max-w-sm">
              Account #{analysis?.accountId || "—"} has no recorded multi-hop transfer history in the journal ledger.
            </p>
          </div>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 560 340">
            <defs>
              <marker
                id="arrow-cycle"
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
                id="arrow-clean"
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
                    stroke={edge.isCycle ? "#e11d48" : "#06b6d4"}
                    strokeWidth={edge.isCycle ? "2.5" : "1.8"}
                    strokeDasharray={edge.isCycle ? "5 3" : "none"}
                    markerEnd={edge.isCycle ? "url(#arrow-cycle)" : "url(#arrow-clean)"}
                    className={
                      edge.isCycle ? "animate-pulse opacity-90" : "opacity-75"
                    }
                  />
                  {/* Flow label */}
                  {edge.label && (
                    <text
                      x={cx}
                      y={cy}
                      fill={edge.isCycle ? "#fca5a5" : "#67e8f9"}
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
                  {/* Outer pulse ring for focus or frozen nodes */}
                  {(node.isFocus || isFrozen) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={22}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="1.5"
                      className="opacity-40 animate-ping"
                    />
                  )}
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
                  {node.balance != null && (
                    <text
                      x={node.x}
                      y={node.y + (isFrozen ? 52 : 43)}
                      fill="#34d399"
                      fontSize="8.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none"
                    >
                      ${Number(node.balance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Graph telemetry footer */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.08] bg-[#0C1017] border-t border-white/[0.08] text-[11px] font-mono py-3 px-4 text-[#8E929B]">
        <div>
          <span className="text-[#6E737D] uppercase tracking-wider block text-[9.5px]">
            24h Fan-Out
          </span>
          <span className="font-semibold text-[#F3F1EC]">
            {analysis?.fanOutCount24h ?? 0} counterparties
          </span>
        </div>
        <div className="px-3">
          <span className="text-[#6E737D] uppercase tracking-wider block text-[9.5px]">
            24h Fan-In
          </span>
          <span className="font-semibold text-[#F3F1EC]">
            {analysis?.fanInCount24h ?? 0} counterparties
          </span>
        </div>
        <div className="pl-3">
          <span className="text-[#6E737D] uppercase tracking-wider block text-[9.5px]">
            Cycle Status
          </span>
          <span
            className={`font-semibold ${
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
