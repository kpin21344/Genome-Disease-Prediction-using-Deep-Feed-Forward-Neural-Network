import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Heart, Baby, Pill, Radiation, FlaskConical, Star } from "lucide-react";
import type { PatientInput } from "@/lib/predictionEngine";

interface Props {
  onSubmit: (input: PatientInput) => void;
  isLoading: boolean;
}

const SYMPTOMS = [
  "None",
  "Seizures",
  "Muscle weakness",
  "Vision loss",
  "Hearing loss",
  "Developmental delay",
  "Breathing difficulty",
  "Fatigue",
  "Pain",
  "Growth abnormality",
];

const SelectField = ({
  label,
  value,
  onChange,
  options,
  importance,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  importance?: "high" | "medium";
}) => (
  <div>
    <label className="label-medical flex items-center gap-2">
      {label}
      {importance === "high" && <span className="badge-high">Critical</span>}
      {importance === "medium" && <span className="badge-medium">Important</span>}
    </label>
    <select className="input-medical" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  </div>
);

const NumberField = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  importance,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  importance?: "high" | "medium";
  unit?: string;
}) => (
  <div>
    <label className="label-medical flex items-center gap-2">
      {label} {unit && <span className="text-muted-foreground text-xs">({unit})</span>}
      {importance === "high" && <span className="badge-high">Critical</span>}
      {importance === "medium" && <span className="badge-medium">Important</span>}
    </label>
    <input
      type="number"
      className="input-medical"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step ?? 1}
    />
  </div>
);

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

export default function PredictionForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState<PatientInput>({
    maternalAge: 5,
    paternalAge: 30,
    bloodCellCount: 4.5,
    whiteBloodCellCount: 7.0,
    bloodTestResult: "Normal",
    birthDefects: "No",
    symptom1: "None",
    symptom2: "None",
    symptom3: "None",
    symptom4: "None",
    symptom5: "None",
    respiratoryRate: 18,
    heartRate: 72,
    gender: "Male",
    birthAsphyxia: "No",
    folicAcidSupplement: "Yes",
    maternalIllness: "No",
    radiationExposure: "No",
    substanceAbuse: "No",
    assistedConception: "No",
    historyOfAnomalies: "No",
    numberOfPreviousAbortions: 0,
    parentalConsent: "Yes",
  });

  const set = <K extends keyof PatientInput>(key: K, val: PatientInput[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-8"
    >
      {/* Section 1: Critical Indicators */}
      <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <h3 className="section-title">Critical Diagnostic Indicators</h3>
          <span className="badge-high ml-auto">Highest Impact</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SelectField
            label="Blood Test Result"
            value={form.bloodTestResult}
            onChange={v => set("bloodTestResult", v)}
            options={["Normal", "Slightly Abnormal", "Abnormal", "Inconclusive"]}
            importance="high"
          />
          <SelectField
            label="Birth Defects"
            value={form.birthDefects}
            onChange={v => set("birthDefects", v)}
            options={["No", "Yes"]}
            importance="high"
          />
          <SelectField
            label="History of Anomalies in Family"
            value={form.historyOfAnomalies}
            onChange={v => set("historyOfAnomalies", v)}
            options={["No", "Yes"]}
            importance="high"
          />
        </div>
      </motion.div>

      {/* Section 2: Symptoms */}
      <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-accent/10">
            <Star className="w-5 h-5 text-accent" />
          </div>
          <h3 className="section-title">Clinical Symptoms</h3>
          <span className="badge-high ml-auto">High Impact</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {([1, 2, 3, 4, 5] as const).map(n => (
            <SelectField
              key={n}
              label={`Symptom ${n}`}
              value={form[`symptom${n}` as keyof PatientInput] as string}
              onChange={v => set(`symptom${n}` as keyof PatientInput, v as never)}
              options={SYMPTOMS}
            />
          ))}
        </div>
      </motion.div>

      {/* Section 3: Parental */}
      <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-primary/10">
            <Baby className="w-5 h-5 text-primary" />
          </div>
          <h3 className="section-title">Parental & Prenatal Factors</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <NumberField label="Patient's Age" value={form.maternalAge} onChange={v => set("maternalAge", v)} min={0} max={55} importance="medium" unit="years" />
          <NumberField label="Paternal Age" value={form.paternalAge} onChange={v => set("paternalAge", v)} min={14} max={70} importance="medium" unit="years" />
          <NumberField label="Previous Abortions" value={form.numberOfPreviousAbortions} onChange={v => set("numberOfPreviousAbortions", v)} min={0} max={10} />
          <SelectField label="Gender" value={form.gender} onChange={v => set("gender", v)} options={["Male", "Female", "Ambiguous"]} />
          <SelectField label="Birth Asphyxia" value={form.birthAsphyxia} onChange={v => set("birthAsphyxia", v)} options={["No", "Yes"]} importance="medium" />
          <SelectField label="Assisted Conception" value={form.assistedConception} onChange={v => set("assistedConception", v)} options={["No", "Yes"]} />
        </div>
      </motion.div>

      {/* Section 4: Medical history */}
      <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-warning/10">
            <Radiation className="w-5 h-5 text-warning" />
          </div>
          <h3 className="section-title">Exposure & Medical History</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SelectField label="Radiation Exposure" value={form.radiationExposure} onChange={v => set("radiationExposure", v)} options={["No", "Yes"]} importance="medium" />
          <SelectField label="Substance Abuse" value={form.substanceAbuse} onChange={v => set("substanceAbuse", v)} options={["No", "Yes"]} importance="medium" />
          <SelectField label="Maternal Illness" value={form.maternalIllness} onChange={v => set("maternalIllness", v)} options={["No", "Yes"]} importance="medium" />
          <SelectField label="Folic Acid Supplement" value={form.folicAcidSupplement} onChange={v => set("folicAcidSupplement", v)} options={["No", "Yes"]} />
          <SelectField label="Parental Consent" value={form.parentalConsent} onChange={v => set("parentalConsent", v)} options={["Yes", "No"]} />
        </div>
      </motion.div>

      {/* Section 5: Vitals */}
      <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-info/10">
            <Activity className="w-5 h-5 text-info" />
          </div>
          <h3 className="section-title">Vital Signs & Lab Values</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <NumberField label="Blood Cell Count" value={form.bloodCellCount} onChange={v => set("bloodCellCount", v)} min={1} max={10} step={0.1} unit="M/µL" />
          <NumberField label="White Blood Cell Count" value={form.whiteBloodCellCount} onChange={v => set("whiteBloodCellCount", v)} min={1} max={20} step={0.1} unit="K/µL" />
          <NumberField label="Heart Rate" value={form.heartRate} onChange={v => set("heartRate", v)} min={30} max={200} unit="bpm" />
          <NumberField label="Respiratory Rate" value={form.respiratoryRate} onChange={v => set("respiratoryRate", v)} min={8} max={40} unit="breaths/min" />
        </div>
      </motion.div>

      {/* Submit */}
      <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible" className="flex justify-center">
        <button
          type="submit"
          disabled={isLoading}
          className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed animate-pulse-glow"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 animate-spin" /> Analyzing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5" /> Run Prediction
            </span>
          )}
        </button>
      </motion.div>
    </form>
  );
}
