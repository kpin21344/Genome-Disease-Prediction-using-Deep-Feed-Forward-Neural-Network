import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { AlertTriangle, CheckCircle, Shield, TrendingUp } from "lucide-react";
import type { PredictionResult } from "@/lib/predictionEngine";

const CHART_COLORS = [
  "hsl(168, 80%, 36%)",
  "hsl(262, 60%, 55%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(210, 100%, 52%)",
  "hsl(152, 69%, 40%)",
];

function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value * circumference);
  const color = pct >= 80 ? "text-success" : pct >= 60 ? "text-warning" : "text-destructive";

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r="45" fill="none"
          stroke="currentColor"
          className={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="50" textAnchor="middle" dy="0.35em" className="fill-foreground font-display text-xl font-bold" fontSize="20">
          {pct}%
        </text>
      </svg>
      <span className="text-sm text-muted-foreground mt-1">Confidence</span>
    </div>
  );
}

export default function PredictionReport({ result }: { result: PredictionResult }) {
  const riskLevel = result.confidence >= 0.75
    ? { label: "High Risk", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle }
    : result.confidence >= 0.55
      ? { label: "Moderate Risk", color: "text-warning", bg: "bg-warning/10", icon: TrendingUp }
      : { label: "Low Risk", color: "text-success", bg: "bg-success/10", icon: CheckCircle };

  const RiskIcon = riskLevel.icon;

  const radarData = result.riskFactors.slice(0, 6).map(f => ({
    feature: f.factor.length > 18 ? f.factor.slice(0, 16) + "…" : f.factor,
    value: Math.round(f.impact * 100),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ConfidenceGauge value={result.confidence} />
          <div className="flex-1 text-center md:text-left">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${riskLevel.bg} ${riskLevel.color} text-sm font-medium mb-3`}>
              <RiskIcon className="w-4 h-4" />
              {riskLevel.label}
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">
              {result.geneticDisorder}
            </h2>
            <p className="text-muted-foreground">
              Subclass: <span className="text-foreground font-medium">{result.disorderSubclass}</span>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-primary/5">
            <Shield className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disorder Class Distribution */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="section-title mb-4">Disorder Classification</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={result.classDistribution}
                dataKey="probability"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={3}
                label={({ name, probability }) => `${Math.round(probability * 100)}%`}
                labelLine={false}
              >
                {result.classDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => `${(val * 100).toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {result.classDistribution.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                {d.name.split(" ").slice(0, 2).join(" ")}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Subclass Distribution */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h3 className="section-title mb-4">Subclass Probability</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={result.subclassDistribution} layout="vertical">
              <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} fontSize={11} />
              <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip formatter={(val: number) => `${(val * 100).toFixed(1)}%`} />
              <Bar dataKey="probability" radius={[0, 6, 6, 0]}>
                {result.subclassDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Risk Radar */}
        {radarData.length >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card p-6">
            <h3 className="section-title mb-4">Risk Factor Radar</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="feature" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar dataKey="value" stroke="hsl(168, 80%, 36%)" fill="hsl(168, 80%, 36%)" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Risk Factors Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="glass-card p-6">
          <h3 className="section-title mb-4">Identified Risk Factors</h3>
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
            {result.riskFactors.map((f, i) => (
              <motion.div
                key={f.factor}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{f.factor}</span>
                    <span className={`text-xs font-medium ${f.category === "Critical" ? "text-destructive" : f.category === "High" ? "text-warning" : "text-muted-foreground"
                      }`}>
                      {f.category}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: f.impact > 0.7 ? "hsl(0, 72%, 51%)" : f.impact > 0.5 ? "hsl(38, 92%, 50%)" : "hsl(168, 80%, 36%)",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${f.impact * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.7 + i * 0.05 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
            {result.riskFactors.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No significant risk factors identified.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Disclaimer */}
      <div className="glass-card p-4 border-l-4 border-warning">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Disclaimer:</strong> This is AI-generated prediction for demonstration purposes only.
          It does not constitute medical advice. Always consult qualified healthcare professionals for genetic disorder diagnosis and counseling.
        </p>
      </div>
    </motion.div>
  );
}
