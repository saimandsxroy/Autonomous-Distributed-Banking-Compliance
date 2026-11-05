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
