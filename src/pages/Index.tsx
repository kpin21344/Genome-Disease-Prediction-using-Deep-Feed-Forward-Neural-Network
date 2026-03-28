import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Dna, ArrowDown, Wifi, WifiOff } from "lucide-react";
import PredictionForm from "@/components/PredictionForm";
import PredictionReport from "@/components/PredictionReport";
import { predict, type PatientInput, type PredictionResult } from "@/lib/predictionEngine";
import { predictFromAPI, checkAPIHealth } from "@/lib/apiClient";
import { toast } from "sonner";

export default function Index() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAPIHealth().then(setApiConnected);
  }, []);

  const handleSubmit = async (input: PatientInput) => {
    setIsLoading(true);
    setResult(null);

    try {
      let prediction: PredictionResult;

      if (apiConnected) {
        prediction = await predictFromAPI(input);
        toast.success("Prediction from trained MLP model");
      } else {
        // Fallback to client-side simulation
        await new Promise(r => setTimeout(r, 1500));
        prediction = predict(input);
        toast.info("Using simulated prediction (backend not connected)");
      }

      setResult(prediction);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Prediction error:", err);
      // Fallback to simulation on API failure
      await new Promise(r => setTimeout(r, 500));
      const prediction = predict(input);
      setResult(prediction);
      toast.warning("API error — using simulated prediction as fallback");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <div className="p-3 rounded-2xl bg-primary/20 backdrop-blur-sm">
              <Dna className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight">
              GeneSight
            </h1>
          </motion.div>
          {apiConnected !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
                apiConnected
                  ? "bg-success/20 text-success"
                  : "bg-muted/30 text-primary-foreground/60"
              }`}
            >
              {apiConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {apiConnected ? "Connected to trained MLP model" : "Using simulated prediction"}
            </motion.div>
          )}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-primary-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-8"
          >
            AI-powered genetic disorder prediction using Multi-Layer Perceptron neural networks.
            Input patient data to receive a comprehensive risk analysis.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <ArrowDown className="w-5 h-5 text-primary-foreground/40 mx-auto animate-bounce" />
          </motion.div>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <PredictionForm onSubmit={handleSubmit} isLoading={isLoading} />

        {/* Report */}
        <div ref={reportRef} className="mt-12">
          {result && <PredictionReport result={result} />}
        </div>
      </main>
    </div>
  );
}
