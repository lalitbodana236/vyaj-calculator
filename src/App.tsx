import { useEffect, useMemo, useState } from "react";
import { BreakdownTable } from "./components/BreakdownTable";
import { InputField } from "./components/InputField";
import { SegmentedToggle } from "./components/SegmentedToggle";
import { SummaryCard } from "./components/SummaryCard";
import type {
  CalculationMode,
  FormValues,
  PersistedState,
  RateInputMode,
  ThemeMode,
} from "./types";
import {
  calculateInterest,
  formatCurrency,
  formatNumber,
  getDurationMetrics,
  getValidationErrors,
} from "./utils/calculator";
import { loadSavedState, saveState } from "./utils/storage";

const today = new Date();
const nextMonth = new Date(today);
nextMonth.setMonth(nextMonth.getMonth() + 1);

const defaultValues: FormValues = {
  principal: "100000",
  rate: "2",
  startDate: today.toISOString().slice(0, 10),
  endDate: nextMonth.toISOString().slice(0, 10),
};

const initialState: PersistedState = {
  calculationMode: "simple",
  rateInputMode: "monthlyPerHundred",
  formValues: defaultValues,
  themeMode: "light",
};

export default function App() {
  const savedState = loadSavedState();
  const [calculationMode, setCalculationMode] = useState<CalculationMode>(
    savedState?.calculationMode ?? initialState.calculationMode,
  );
  const [rateInputMode, setRateInputMode] = useState<RateInputMode>(
    savedState?.rateInputMode ?? initialState.rateInputMode,
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    savedState?.themeMode ?? initialState.themeMode,
  );
  const [formValues, setFormValues] = useState<FormValues>(
    savedState?.formValues ?? initialState.formValues,
  );

  const errors = useMemo(() => getValidationErrors(formValues), [formValues]);
  const result = useMemo(
    () => calculateInterest(formValues, calculationMode, rateInputMode),
    [formValues, calculationMode, rateInputMode],
  );
  const duration = useMemo(
    () => getDurationMetrics(formValues.startDate, formValues.endDate),
    [formValues.startDate, formValues.endDate],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    saveState({
      calculationMode,
      rateInputMode,
      formValues,
      themeMode,
    });
  }, [calculationMode, rateInputMode, formValues, themeMode]);

  function updateField(field: keyof FormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleReset() {
    setCalculationMode(initialState.calculationMode);
    setRateInputMode(initialState.rateInputMode);
    setThemeMode(initialState.themeMode);
    setFormValues(initialState.formValues);
  }

  return (
    <div className="app-shell">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      <main className="app-layout">
        <section className="hero-card">
          <div className="hero-topline">
            <span className="brand-badge">Vyaj Calculator</span>
            <button
              type="button"
              className="theme-toggle"
              onClick={() =>
                setThemeMode((current) => (current === "light" ? "dark" : "light"))
              }
            >
              {themeMode === "light" ? "Dark Mode" : "Light Mode"}
            </button>
          </div>

          <div className="hero-content">
            <div>
              <p className="eyebrow">Interest Calculator / ब्याज कैलकुलेटर</p>
              <h1>Simple and compound interest, built for daily Indian use.</h1>
              <p className="hero-copy">
                Compare SI and CI instantly, calculate from exact dates, and switch
                between yearly percentage and monthly rupees-per-100 rate styles.
              </p>
            </div>

            <div className="hero-stats">
              <SummaryCard
                label="Rate Converted / वार्षिक दर"
                value={result ? `${formatNumber(result.ratePercent)}% p.a.` : "--"}
              />
              <SummaryCard
                label="Duration / अवधि"
                value={`${formatNumber(duration.durationYears)} years`}
              />
            </div>
          </div>
        </section>

        <section className="panel-grid">
          <article className="calculator-card">
            <div className="section-heading">
              <div>
                <h2>Calculator / गणना</h2>
                <p>Real-time updates with bilingual labels and instant validation.</p>
              </div>
              <button type="button" className="reset-button" onClick={handleReset}>
                Reset / रीसेट
              </button>
            </div>

            <div className="toggle-stack">
              <div>
                <span className="mini-label">Mode / प्रकार</span>
                <SegmentedToggle
                  value={calculationMode}
                  onChange={setCalculationMode}
                  options={[
                    { value: "simple", label: "Simple Interest / साधारण" },
                    { value: "compound", label: "Compound Interest / चक्रवृद्धि" },
                  ]}
                />
              </div>

              <div>
                <span className="mini-label">Rate Input / ब्याज दर</span>
                <SegmentedToggle
                  value={rateInputMode}
                  onChange={setRateInputMode}
                  options={[
                    { value: "yearlyPercent", label: "% per year / वार्षिक %" },
                    { value: "monthlyPerHundred", label: "₹ per ₹100 / month" },
                  ]}
                />
              </div>
            </div>

            <div className="form-grid">
              <InputField
                label="Amount / राशि (₹)"
                type="number"
                min="0"
                step="0.01"
                value={formValues.principal}
                onChange={(event) => updateField("principal", event.target.value)}
                placeholder="Enter principal amount"
              />
              <InputField
                label={
                  rateInputMode === "yearlyPercent"
                    ? "Interest / ब्याज (%)"
                    : "Interest / ब्याज (₹ per ₹100 per month)"
                }
                type="number"
                min="0"
                step="0.01"
                value={formValues.rate}
                onChange={(event) => updateField("rate", event.target.value)}
                placeholder="Enter rate"
                hint={
                  rateInputMode === "yearlyPercent"
                    ? "Example: 18 means 18% yearly"
                    : "Example: 2 means ₹2 per ₹100 each month"
                }
              />
              <InputField
                label="Start Date / प्रारंभ तिथि"
                type="date"
                value={formValues.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
              />
              <InputField
                label="End Date / समाप्ति तिथि"
                type="date"
                value={formValues.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
              />
            </div>

            {errors.length > 0 ? (
              <div className="error-box" role="alert">
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : (
              <div className="status-box">
                <p>
                  Saved locally and recalculated instantly. Last used values persist in
                  this browser.
                </p>
              </div>
            )}
          </article>

          <article className="results-card">
            <div className="section-heading">
              <div>
                <h2>Results / परिणाम</h2>
                <p>Transparent interest totals with duration and maturity amount.</p>
              </div>
            </div>

            <div className="summary-grid">
              <SummaryCard
                label="Total Interest / कुल ब्याज"
                value={result ? formatCurrency(result.totalInterest) : "--"}
                accent
              />
              <SummaryCard
                label="Final Amount / कुल राशि"
                value={result ? formatCurrency(result.finalAmount) : "--"}
              />
              <SummaryCard
                label="Duration / अवधि"
                value={
                  result
                    ? `${formatNumber(result.durationYears)} years · ${formatNumber(
                        result.durationMonths,
                      )} months`
                    : "--"
                }
              />
              <SummaryCard
                label="Converted Rate / परिवर्तित दर"
                value={result ? `${formatNumber(result.ratePercent)}% p.a.` : "--"}
              />
            </div>

            <div className="formula-card">
              <h3>Formula / सूत्र</h3>
              <p>
                {calculationMode === "simple"
                  ? "SI = (P × R × T) / 100"
                  : "CI = P × (1 + R / 100)^T − P"}
              </p>
              <p>
                Time is derived from exact date difference using a 365-day year, and
                monthly rupee rates are converted to yearly percentage internally.
              </p>
            </div>
          </article>
        </section>

        {result ? <BreakdownTable rows={result.breakdown} mode={calculationMode} /> : null}
      </main>
    </div>
  );
}
