import { useEffect, useMemo, useState } from "react";
import { BreakdownTable } from "./components/BreakdownTable";
import { InputField } from "./components/InputField";
import { SegmentedToggle } from "./components/SegmentedToggle";
import { SummaryCard } from "./components/SummaryCard";
import type {
  CalculationMode,
  CalculatorType,
  CompoundingFrequency,
  InterestFormValues,
  LoanScheduleRow,
  LoanFormValues,
  PersistedState,
  RateInputMode,
  StockAverageRow,
  TenureUnit,
  ThemeMode,
} from "./types";
import {
  calculateFd,
  calculateFdVsLoan,
  calculateInterest,
  calculateLoan,
  calculateStockAverage,
  formatCurrency,
  formatNumber,
  getDurationMetrics,
  getFdValidationErrors,
  getFdVsLoanValidationErrors,
  getInterestValidationErrors,
  getLoanValidationErrors,
  getStockAverageValidationErrors,
} from "./utils/calculator";
import { createInitialState, loadSavedState, saveState } from "./utils/storage";

const initialState = createInitialState();

const calculatorOptions: Array<{
  value: CalculatorType;
  label: string;
  description: string;
}> = [
  {
    value: "interest",
    label: "Vyaj Calculator",
    description: "Simple or compound interest using exact dates.",
  },
  {
    value: "stockAverage",
    label: "Stock Average",
    description: "Find your average buy price after many entries.",
  },
  {
    value: "loan",
    label: "Loan Calculator",
    description: "Check EMI, total interest, and full repayment cost.",
  },
  {
    value: "fdInterest",
    label: "FD Calculator",
    description: "See maturity amount and total interest from an FD.",
  },
  {
    value: "fdVsLoan",
    label: "FD vs Loan Compare",
    description: "Compare FD gain against loan cost in one view.",
  },
];

const tenureOptions: Array<{ value: TenureUnit; label: string }> = [
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

const compoundingOptions: Array<{ value: CompoundingFrequency; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "halfYearly", label: "Half-yearly" },
  { value: "yearly", label: "Yearly" },
];

function WhatThisMeans({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="formula-card">
      <h3>{title}</h3>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="error-box" role="alert">
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  );
}

function StockRowsTable({
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  rows: StockAverageRow[];
  onChange: (id: string, field: "price" | "quantity", value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="entry-list">
      {rows.map((row, index) => (
        <div key={row.id} className="entry-row-card">
          <div className="entry-row-topline">
            <strong>Buy Entry {index + 1}</strong>
            {rows.length > 1 ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => onRemove(row.id)}
              >
                Remove
              </button>
            ) : null}
          </div>
          <div className="form-grid">
            <InputField
              label="Buy price per share (Rs)"
              type="number"
              min="0"
              step="0.01"
              value={row.price}
              onChange={(event) => onChange(row.id, "price", event.target.value)}
              placeholder="Example: 125.50"
            />
            <InputField
              label="Quantity"
              type="number"
              min="0"
              step="1"
              value={row.quantity}
              onChange={(event) => onChange(row.id, "quantity", event.target.value)}
              placeholder="Example: 10"
            />
          </div>
        </div>
      ))}

      <button type="button" className="secondary-button" onClick={onAdd}>
        Add another buy entry
      </button>
    </div>
  );
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getCalendarMeta(monthNumber: number) {
  const start = new Date();
  const date = new Date(start.getFullYear(), start.getMonth() + monthNumber - 1, 1);

  return {
    year: date.getFullYear(),
    monthLabel: monthNames[date.getMonth()],
  };
}

function groupByYear<T extends { month: number }>(rows: T[]) {
  const groups: Array<{ year: number; rows: Array<T & { monthLabel: string }> }> = [];

  rows.forEach((row) => {
    const meta = getCalendarMeta(row.month);
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.year !== meta.year) {
      groups.push({
        year: meta.year,
        rows: [{ ...row, monthLabel: meta.monthLabel }],
      });
      return;
    }

    lastGroup.rows.push({ ...row, monthLabel: meta.monthLabel });
  });

  return groups;
}

function LoanYearlyBreakdown({
  rows,
}: {
  rows: Array<{ year: number; rows: Array<LoanScheduleRow & { monthLabel: string }> }>;
}) {
  return (
    <div className="yearly-breakdown">
      {rows.map((group) => (
        <section key={group.year} className="year-block">
          <div className="year-block-header">
            <h4>{group.year}</h4>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Principal paid</th>
                  <th>Interest charged</th>
                  <th>Total payment</th>
                  <th>Paid interest</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={`${group.year}-${row.month}`}>
                    <td>{row.monthLabel}</td>
                    <td>{formatCurrency(row.principalPaid)}</td>
                    <td>{formatCurrency(row.interestPaid)}</td>
                    <td>{formatCurrency(row.totalPayment)}</td>
                    <td>{formatCurrency(row.cumulativeInterestPaid)}</td>
                    <td>{formatCurrency(row.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function FdYearlyBreakdown({
  rows,
}: {
  rows: Array<{
    year: number;
    rows: Array<{
      month: number;
      monthLabel: string;
      openingBalance: number;
      interestEarned: number;
      cumulativeInterestEarned: number;
      closingBalance: number;
    }>;
  }>;
}) {
  return (
    <div className="yearly-breakdown">
      {rows.map((group) => (
        <section key={group.year} className="year-block">
          <div className="year-block-header">
            <h4>{group.year}</h4>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Opening amount</th>
                  <th>Interest credited</th>
                  <th>Total FD interest</th>
                  <th>Closing amount</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={`${group.year}-${row.month}`}>
                    <td>{row.monthLabel}</td>
                    <td>{formatCurrency(row.openingBalance)}</td>
                    <td>{formatCurrency(row.interestEarned)}</td>
                    <td>{formatCurrency(row.cumulativeInterestEarned)}</td>
                    <td>{formatCurrency(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function CombinedFdLoanBreakdown({
  fdRows,
  loanRows,
}: {
  fdRows: Array<{
    year: number;
    rows: Array<{
      month: number;
      monthLabel: string;
      openingBalance: number;
      interestEarned: number;
      cumulativeInterestEarned: number;
      closingBalance: number;
    }>;
  }>;
  loanRows: Array<{ year: number; rows: Array<LoanScheduleRow & { monthLabel: string }> }>;
}) {
  const yearMap = new Map<
    number,
    {
      fdRows: Map<number, (typeof fdRows)[number]["rows"][number]>;
      loanRows: Map<number, (typeof loanRows)[number]["rows"][number]>;
    }
  >();

  fdRows.forEach((group) => {
    const existing = yearMap.get(group.year) ?? {
      fdRows: new Map<number, (typeof fdRows)[number]["rows"][number]>(),
      loanRows: new Map<number, (typeof loanRows)[number]["rows"][number]>(),
    };
    group.rows.forEach((row) => existing.fdRows.set(row.month, row));
    yearMap.set(group.year, existing);
  });

  loanRows.forEach((group) => {
    const existing = yearMap.get(group.year) ?? {
      fdRows: new Map<number, (typeof fdRows)[number]["rows"][number]>(),
      loanRows: new Map<number, (typeof loanRows)[number]["rows"][number]>(),
    };
    group.rows.forEach((row) => existing.loanRows.set(row.month, row));
    yearMap.set(group.year, existing);
  });

  const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
  const lastYear = years[years.length - 1];
  const lastGroup = lastYear ? yearMap.get(lastYear) : undefined;
  const lastMonth = lastGroup
    ? Math.max(...Array.from(new Set([...lastGroup.fdRows.keys(), ...lastGroup.loanRows.keys()])))
    : undefined;
  const finalFdRow = lastGroup && lastMonth ? lastGroup.fdRows.get(lastMonth) : undefined;
  const finalLoanRow = lastGroup && lastMonth ? lastGroup.loanRows.get(lastMonth) : undefined;

  return (
    <div className="yearly-breakdown">
      {years.map((year) => {
        const group = yearMap.get(year)!;
        const months = Array.from(
          new Set([...group.fdRows.keys(), ...group.loanRows.keys()]),
        ).sort((a, b) => a - b);

        return (
          <section key={year} className="year-block">
            <div className="year-block-header">
              <h4>{year}</h4>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>FD opening</th>
                    <th>FD interest</th>
                    <th>FD closing</th>
                    <th>Loan principal</th>
                    <th>Loan interest</th>
                    <th>Loan payment</th>
                    <th>Loan balance</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month) => {
                    const fdRow = group.fdRows.get(month);
                    const loanRow = group.loanRows.get(month);
                    const label = fdRow?.monthLabel ?? loanRow?.monthLabel ?? `${month}`;

                    return (
                      <tr key={`${year}-${month}`}>
                        <td>{label}</td>
                        <td>{fdRow ? formatCurrency(fdRow.openingBalance) : "--"}</td>
                        <td>{fdRow ? formatCurrency(fdRow.interestEarned) : "--"}</td>
                        <td>{fdRow ? formatCurrency(fdRow.closingBalance) : "--"}</td>
                        <td>{loanRow ? formatCurrency(loanRow.principalPaid) : "--"}</td>
                        <td>{loanRow ? formatCurrency(loanRow.interestPaid) : "--"}</td>
                        <td>{loanRow ? formatCurrency(loanRow.totalPayment) : "--"}</td>
                        <td>{loanRow ? formatCurrency(loanRow.remainingBalance) : "--"}</td>
                      </tr>
                    );
                  })}
                  {(() => {
                    const lastMonthInYear = months[months.length - 1];
                    const yearFdRow = group.fdRows.get(lastMonthInYear);
                    const yearLoanRow = group.loanRows.get(lastMonthInYear);

                    return (
                      <tr className="summary-row">
                        <td>Year total</td>
                        <td colSpan={2}>FD total interest</td>
                        <td>{yearFdRow ? formatCurrency(yearFdRow.cumulativeInterestEarned) : "--"}</td>
                        <td>Loan total interest</td>
                        <td>{yearLoanRow ? formatCurrency(yearLoanRow.cumulativeInterestPaid) : "--"}</td>
                        <td>Loan balance left</td>
                        <td>{yearLoanRow ? formatCurrency(yearLoanRow.remainingBalance) : "--"}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <section className="year-block">
        <div className="year-block-header">
          <h4>Final Summary</h4>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>FD total interest</th>
                <th>Loan paid interest</th>
                <th>Net interest benefit</th>
                <th>FD final amount</th>
                <th>Loan balance left</th>
              </tr>
            </thead>
            <tbody>
              <tr className="summary-row">
                <td>{finalFdRow ? formatCurrency(finalFdRow.cumulativeInterestEarned) : "--"}</td>
                <td>
                  {finalLoanRow ? formatCurrency(finalLoanRow.cumulativeInterestPaid) : "--"}
                </td>
                <td>
                  {finalFdRow || finalLoanRow
                    ? formatCurrency(
                        (finalFdRow?.cumulativeInterestEarned ?? 0) -
                          (finalLoanRow?.cumulativeInterestPaid ?? 0),
                      )
                    : "--"}
                </td>
                <td>{finalFdRow ? formatCurrency(finalFdRow.closingBalance) : "--"}</td>
                <td>{finalLoanRow ? formatCurrency(finalLoanRow.remainingBalance) : "--"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const savedState = loadSavedState();
  const [calculatorType, setCalculatorType] = useState<CalculatorType>(
    savedState?.calculatorType ?? initialState.calculatorType,
  );
  const [calculationMode, setCalculationMode] = useState<CalculationMode>(
    savedState?.calculationMode ?? initialState.calculationMode,
  );
  const [rateInputMode, setRateInputMode] = useState<RateInputMode>(
    savedState?.rateInputMode ?? initialState.rateInputMode,
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    savedState?.themeMode ?? initialState.themeMode,
  );
  const [forms, setForms] = useState<PersistedState["forms"]>(
    savedState?.forms ?? initialState.forms,
  );

  const interestErrors = useMemo(
    () => getInterestValidationErrors(forms.interest),
    [forms.interest],
  );
  const interestResult = useMemo(
    () => calculateInterest(forms.interest, calculationMode, rateInputMode),
    [forms.interest, calculationMode, rateInputMode],
  );
  const interestDuration = useMemo(
    () => getDurationMetrics(forms.interest.startDate, forms.interest.endDate),
    [forms.interest.endDate, forms.interest.startDate],
  );

  const stockErrors = useMemo(
    () => getStockAverageValidationErrors(forms.stockAverage),
    [forms.stockAverage],
  );
  const stockResult = useMemo(
    () => calculateStockAverage(forms.stockAverage),
    [forms.stockAverage],
  );

  const loanErrors = useMemo(() => getLoanValidationErrors(forms.loan), [forms.loan]);
  const loanResult = useMemo(() => calculateLoan(forms.loan), [forms.loan]);
  const loanYearGroups = useMemo(
    () => (loanResult ? groupByYear(loanResult.schedule) : []),
    [loanResult],
  );

  const fdErrors = useMemo(
    () => getFdValidationErrors(forms.fdInterest),
    [forms.fdInterest],
  );
  const fdResult = useMemo(() => calculateFd(forms.fdInterest), [forms.fdInterest]);
  const fdYearGroups = useMemo(() => (fdResult ? groupByYear(fdResult.growth) : []), [fdResult]);

  const fdVsLoanErrors = useMemo(
    () => getFdVsLoanValidationErrors(forms.fdVsLoan),
    [forms.fdVsLoan],
  );
  const fdVsLoanResult = useMemo(
    () => calculateFdVsLoan(forms.fdVsLoan),
    [forms.fdVsLoan],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    saveState({
      calculatorType,
      calculationMode,
      rateInputMode,
      themeMode,
      forms,
    });
  }, [calculatorType, calculationMode, forms, rateInputMode, themeMode]);

  function updateInterestField(field: keyof InterestFormValues, value: string) {
    setForms((current) => ({
      ...current,
      interest: {
        ...current.interest,
        [field]: value,
      },
    }));
  }

  function updateLoanField(field: keyof LoanFormValues, value: string | TenureUnit) {
    setForms((current) => ({
      ...current,
      loan: {
        ...current.loan,
        [field]: value,
      },
    }));
  }

  function handleResetCurrentCalculator() {
    setForms((current) => ({
      ...current,
      [calculatorType]: initialState.forms[calculatorType],
    }));

    if (calculatorType === "interest") {
      setCalculationMode(initialState.calculationMode);
      setRateInputMode(initialState.rateInputMode);
    }
  }

  function addStockRow() {
    setForms((current) => ({
      ...current,
      stockAverage: {
        ...current.stockAverage,
        rows: [
          ...current.stockAverage.rows,
          {
            id: `row-${Date.now()}-${current.stockAverage.rows.length + 1}`,
            price: "",
            quantity: "",
          },
        ],
      },
    }));
  }

  function updateStockRow(id: string, field: "price" | "quantity", value: string) {
    setForms((current) => ({
      ...current,
      stockAverage: {
        ...current.stockAverage,
        rows: current.stockAverage.rows.map((row) =>
          row.id === id ? { ...row, [field]: value } : row,
        ),
      },
    }));
  }

  function removeStockRow(id: string) {
    setForms((current) => ({
      ...current,
      stockAverage: {
        ...current.stockAverage,
        rows: current.stockAverage.rows.filter((row) => row.id !== id),
      },
    }));
  }

  const selectedCalculator = calculatorOptions.find(
    (option) => option.value === calculatorType,
  );

  return (
    <div className="app-shell">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      <main className="app-layout">
        <section className="hero-card">
          <div className="hero-topline">
            <span className="brand-badge">Vyaj Calculator Suite</span>
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
            <div className="hero-copy-block">
              <p className="eyebrow">Easy money tools for daily use</p>
              <h1>Understand interest, EMI, FD, and stock average without finance jargon.</h1>
              <p className="hero-copy">
                Pick a calculator, enter your numbers, and read the simple explanation
                cards to understand what the result means in real life.
              </p>
            </div>

            <div className="hero-stats">
              <SummaryCard
                label="Active Calculator"
                value={selectedCalculator?.label ?? "--"}
                accent
              />
              <SummaryCard
                label="Tools Included"
                value={`${calculatorOptions.length} calculators ready`}
              />
            </div>
          </div>
        </section>

        <section className="calculator-selector-card">
          <div className="section-heading">
            <div>
              <h2>Select Calculator</h2>
              <p>Choose the task you want to understand today.</p>
            </div>
          </div>

          <div className="calculator-selector-grid">
            {calculatorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`calculator-option calculator-option-${option.value}${
                  option.value === calculatorType ? " active" : ""
                }`}
                onClick={() => setCalculatorType(option.value)}
              >
                <div className="calculator-option-topline">
                  <strong>{option.label}</strong>
                  <span className="option-tag live">Ready</span>
                </div>
                <p>{option.description}</p>
              </button>
            ))}
          </div>
        </section>

        {calculatorType === "interest" ? (
          <>
            <section className="panel-grid">
              <article className="calculator-card">
                <div className="section-heading">
                  <div>
                    <h2>Interest Calculator</h2>
                    <p>Find simple interest or compound interest between two dates.</p>
                  </div>
                  <button
                    type="button"
                    className="reset-button"
                    onClick={handleResetCurrentCalculator}
                  >
                    Reset
                  </button>
                </div>

                <div className="toggle-stack">
                  <div>
                    <span className="mini-label">Interest type</span>
                    <SegmentedToggle
                      value={calculationMode}
                      onChange={setCalculationMode}
                      options={[
                        { value: "simple", label: "Simple interest" },
                        { value: "compound", label: "Compound interest" },
                      ]}
                    />
                  </div>

                  <div>
                    <span className="mini-label">Rate format</span>
                    <SegmentedToggle
                      value={rateInputMode}
                      onChange={setRateInputMode}
                      options={[
                        { value: "yearlyPercent", label: "Percent per year" },
                        { value: "monthlyPerHundred", label: "Rs per 100 per month" },
                      ]}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <InputField
                    label="Principal amount (Rs)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={forms.interest.principal}
                    onChange={(event) => updateInterestField("principal", event.target.value)}
                    placeholder="Example: 100000"
                  />
                  <InputField
                    label={
                      rateInputMode === "yearlyPercent"
                        ? "Interest rate (% per year)"
                        : "Interest (Rs per 100 per month)"
                    }
                    type="number"
                    min="0"
                    step="0.01"
                    value={forms.interest.rate}
                    onChange={(event) => updateInterestField("rate", event.target.value)}
                    placeholder="Enter rate"
                    hint={
                      rateInputMode === "yearlyPercent"
                        ? "Example: 12 means 12 percent yearly."
                        : "Example: 2 means Rs 2 per 100 every month."
                    }
                  />
                  <InputField
                    label="Start date"
                    type="date"
                    value={forms.interest.startDate}
                    onChange={(event) => updateInterestField("startDate", event.target.value)}
                  />
                  <InputField
                    label="End date"
                    type="date"
                    value={forms.interest.endDate}
                    onChange={(event) => updateInterestField("endDate", event.target.value)}
                  />
                </div>

                <ErrorList errors={interestErrors} />
              </article>

              <article className="results-card">
                <div className="section-heading">
                  <div>
                    <h2>Results</h2>
                    <p>The calculator updates as soon as you change any field.</p>
                  </div>
                </div>

                <div className="summary-grid">
                  <SummaryCard
                    label="Interest earned"
                    value={interestResult ? formatCurrency(interestResult.totalInterest) : "--"}
                    accent
                  />
                  <SummaryCard
                    label="Final amount"
                    value={interestResult ? formatCurrency(interestResult.finalAmount) : "--"}
                  />
                  <SummaryCard
                    label="Time period"
                    value={
                      interestResult
                        ? `${formatNumber(interestResult.durationYears)} years`
                        : "--"
                    }
                  />
                  <SummaryCard
                    label="Converted yearly rate"
                    value={
                      interestResult ? `${formatNumber(interestResult.ratePercent)}%` : "--"
                    }
                  />
                </div>

                <WhatThisMeans
                  title="What this means"
                  lines={
                    interestResult
                      ? [
                          `You started with ${formatCurrency(Number(forms.interest.principal || 0))} and the interest part becomes ${formatCurrency(interestResult.totalInterest)}.`,
                          `At the end of this period, you receive ${formatCurrency(interestResult.finalAmount)} in total.`,
                          `Time used for calculation is ${formatNumber(interestDuration.durationMonths)} months.`,
                        ]
                      : [
                          "Enter amount, rate, and dates to see the result.",
                          "This tool works for both simple interest and compound interest.",
                        ]
                  }
                />
              </article>
            </section>

            {interestResult ? (
              <BreakdownTable rows={interestResult.breakdown} mode={calculationMode} />
            ) : null}
          </>
        ) : null}

        {calculatorType === "stockAverage" ? (
          <section className="panel-grid">
            <article className="calculator-card">
              <div className="section-heading">
                <div>
                  <h2>Stock Average Calculator</h2>
                  <p>Add all your buy entries and find your real average cost per share.</p>
                </div>
                <button
                  type="button"
                  className="reset-button"
                  onClick={handleResetCurrentCalculator}
                >
                  Reset
                </button>
              </div>

              <StockRowsTable
                rows={forms.stockAverage.rows}
                onChange={updateStockRow}
                onAdd={addStockRow}
                onRemove={removeStockRow}
              />

              <InputField
                label="Current market price (optional)"
                type="number"
                min="0"
                step="0.01"
                value={forms.stockAverage.marketPrice}
                onChange={(event) =>
                  setForms((current) => ({
                    ...current,
                    stockAverage: {
                      ...current.stockAverage,
                      marketPrice: event.target.value,
                    },
                  }))
                }
                placeholder="Example: 110"
                hint="If you enter current price, the tool will show profit or loss."
              />

              <ErrorList errors={stockErrors} />
            </article>

            <article className="results-card">
              <div className="section-heading">
                <div>
                  <h2>Results</h2>
                  <p>See your average buy price and present position clearly.</p>
                </div>
              </div>

              <div className="summary-grid">
                <SummaryCard
                  label="Average buy price"
                  value={stockResult ? formatCurrency(stockResult.averagePrice) : "--"}
                  accent
                />
                <SummaryCard
                  label="Total shares"
                  value={stockResult ? formatNumber(stockResult.totalShares) : "--"}
                />
                <SummaryCard
                  label="Total invested"
                  value={stockResult ? formatCurrency(stockResult.totalInvestment) : "--"}
                />
                <SummaryCard
                  label="Current value"
                  value={stockResult ? formatCurrency(stockResult.marketValue) : "--"}
                />
              </div>

              <WhatThisMeans
                title="What this means"
                lines={
                  stockResult
                    ? [
                        `You bought ${formatNumber(stockResult.totalShares)} shares in total.`,
                        `Your average cost is ${formatCurrency(stockResult.averagePrice)} per share.`,
                        stockResult.profitOrLoss >= 0
                          ? `At the current market price, you are in profit by ${formatCurrency(stockResult.profitOrLoss)}.`
                          : `At the current market price, you are in loss by ${formatCurrency(Math.abs(stockResult.profitOrLoss))}.`,
                      ]
                    : [
                        "Add at least one stock buy row with price and quantity.",
                        "This tool is useful when you buy the same stock many times at different prices.",
                      ]
                }
              />
            </article>
          </section>
        ) : null}

        {calculatorType === "loan" ? (
          <>
            <section className="panel-grid">
              <article className="calculator-card">
                <div className="section-heading">
                  <div>
                    <h2>Loan Calculator</h2>
                    <p>Check monthly EMI, total interest, and the full cost of the loan.</p>
                  </div>
                  <button
                    type="button"
                    className="reset-button"
                    onClick={handleResetCurrentCalculator}
                  >
                    Reset
                  </button>
                </div>

                <div className="form-grid">
                  <InputField
                    label="Loan amount (Rs)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={forms.loan.amount}
                    onChange={(event) => updateLoanField("amount", event.target.value)}
                    placeholder="Example: 100000"
                  />
                  <InputField
                    label="Interest rate (% per year)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={forms.loan.rate}
                    onChange={(event) => updateLoanField("rate", event.target.value)}
                    placeholder="Example: 10"
                  />
                  <InputField
                    label="Loan tenure"
                    type="number"
                    min="0"
                    step="1"
                    value={forms.loan.tenure}
                    onChange={(event) => updateLoanField("tenure", event.target.value)}
                    placeholder="Example: 12"
                  />
                  <InputField
                    label="Processing fee (% of loan amount)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={forms.loan.processingFee}
                    onChange={(event) => updateLoanField("processingFee", event.target.value)}
                    placeholder="Example: 1"
                    hint="Enter 0 if your bank charges no processing fee."
                  />
                  <InputField
                    label="Extra monthly prepayment (Rs)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={forms.loan.monthlyPrepayment}
                    onChange={(event) =>
                      updateLoanField("monthlyPrepayment", event.target.value)
                    }
                    placeholder="Example: 1000"
                    hint="Optional. Useful when you want to close the loan faster."
                  />
                  <InputField
                    label="How many months can you pay extra?"
                    type="number"
                    min="0"
                    step="1"
                    value={forms.loan.prepaymentMonths}
                    onChange={(event) =>
                      updateLoanField("prepaymentMonths", event.target.value)
                    }
                    placeholder="Example: 6"
                    hint="Enter 0 if you do not plan to pay extra."
                  />
                </div>

                <div>
                  <span className="mini-label">Tenure unit</span>
                  <SegmentedToggle
                    value={forms.loan.tenureUnit}
                    onChange={(value) => updateLoanField("tenureUnit", value)}
                    options={tenureOptions}
                  />
                </div>

                <ErrorList errors={loanErrors} />
              </article>

              <article className="results-card">
                <div className="section-heading">
                  <div>
                    <h2>Results</h2>
                    <p>These numbers help you understand monthly burden and total cost.</p>
                  </div>
                </div>

                <div className="summary-grid">
                  <SummaryCard
                    label="Monthly EMI"
                    value={loanResult ? formatCurrency(loanResult.monthlyEmi) : "--"}
                    accent
                  />
                  <SummaryCard
                    label="Total interest"
                    value={loanResult ? formatCurrency(loanResult.totalInterest) : "--"}
                  />
                  <SummaryCard
                    label="Total repayment"
                    value={loanResult ? formatCurrency(loanResult.totalRepayment) : "--"}
                  />
                  <SummaryCard
                    label="Full loan cost"
                    value={loanResult ? formatCurrency(loanResult.totalCost) : "--"}
                  />
                  <SummaryCard
                    label="Months saved"
                    value={loanResult ? `${formatNumber(loanResult.monthsSaved)} months` : "--"}
                  />
                  <SummaryCard
                    label="Months left after extra-payment period"
                    value={
                      loanResult
                        ? `${formatNumber(loanResult.monthsLeftAfterPrepaymentPeriod)} months`
                        : "--"
                    }
                  />
                  <SummaryCard
                    label="Interest saved by extra repayment"
                    value={loanResult ? formatCurrency(loanResult.interestSaved) : "--"}
                  />
                </div>

                <WhatThisMeans
                  title="What this means"
                  lines={
                    loanResult
                      ? [
                          `You will pay about ${formatCurrency(loanResult.monthlyEmi)} every month for ${loanResult.months} months.`,
                          loanResult.monthlyPrepayment > 0 && loanResult.prepaymentMonths > 0
                            ? `You are paying an extra ${formatCurrency(loanResult.monthlyPrepayment)} for ${loanResult.prepaymentMonths} months. After that, about ${loanResult.monthsLeftAfterPrepaymentPeriod} months are still left if you continue with normal EMI only.`
                            : `There is no extra prepayment added here, so the normal EMI schedule is used.`,
                          loanResult.monthlyPrepayment > 0 && loanResult.prepaymentMonths > 0
                            ? `This plan saves about ${loanResult.monthsSaved} months compared with the original ${loanResult.baseMonths}-month loan.`
                            : `This loan keeps the original ${loanResult.baseMonths}-month duration.`,
                          loanResult.monthlyPrepayment > 0 && loanResult.prepaymentMonths > 0
                            ? `Because of this extra repayment plan, you save about ${formatCurrency(loanResult.interestSaved)} in interest.`
                            : `Without extra repayment, there is no additional interest saving beyond the normal plan.`,
                          `Out of your payments, ${formatCurrency(loanResult.totalInterest)} is the cost of borrowing.`,
                          `After adding processing fee, the full money outflow becomes ${formatCurrency(loanResult.totalCost)}.`,
                          "This uses the standard reducing-balance EMI method. Some websites show rounded values without paise, so their EMI may differ by a few paise or by Re 1.",
                        ]
                      : [
                          "Enter loan amount, annual interest rate, and tenure to see EMI.",
                          "This uses the standard reducing-balance EMI formula used by most banks.",
                      ]
                  }
                />
              </article>
            </section>

            {loanResult ? (
              <div className="table-card">
                <div className="table-header">
                  <div>
                    <h3>EMI Breakdown</h3>
                    <p>See month-wise principal, interest, payment, and balance grouped by year.</p>
                  </div>
                </div>
                <LoanYearlyBreakdown rows={loanYearGroups} />
              </div>
            ) : null}
          </>
        ) : null}

        {calculatorType === "fdInterest" ? (
          <>
            <section className="panel-grid">
              <article className="calculator-card">
              <div className="section-heading">
                <div>
                  <h2>FD Interest Calculator</h2>
                  <p>See how much your fixed deposit can grow by maturity date.</p>
                </div>
                <button
                  type="button"
                  className="reset-button"
                  onClick={handleResetCurrentCalculator}
                >
                  Reset
                </button>
              </div>

              <div className="form-grid">
                <InputField
                  label="Deposit amount (Rs)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={forms.fdInterest.amount}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdInterest: {
                        ...current.fdInterest,
                        amount: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 100000"
                />
                <InputField
                  label="Interest rate (% per year)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={forms.fdInterest.rate}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdInterest: {
                        ...current.fdInterest,
                        rate: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 7"
                />
                <InputField
                  label="FD tenure"
                  type="number"
                  min="0"
                  step="1"
                  value={forms.fdInterest.tenure}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdInterest: {
                        ...current.fdInterest,
                        tenure: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 1"
                />
              </div>

              <div className="toggle-stack">
                <div>
                  <span className="mini-label">Tenure unit</span>
                  <SegmentedToggle
                    value={forms.fdInterest.tenureUnit}
                    onChange={(value) =>
                      setForms((current) => ({
                        ...current,
                        fdInterest: {
                          ...current.fdInterest,
                          tenureUnit: value,
                        },
                      }))
                    }
                    options={tenureOptions}
                  />
                </div>

                <div>
                  <span className="mini-label">Compounding frequency</span>
                  <SegmentedToggle
                    value={forms.fdInterest.compounding}
                    onChange={(value) =>
                      setForms((current) => ({
                        ...current,
                        fdInterest: {
                          ...current.fdInterest,
                          compounding: value,
                        },
                      }))
                    }
                    options={compoundingOptions}
                  />
                </div>
              </div>

              <ErrorList errors={fdErrors} />
            </article>

            <article className="results-card">
              <div className="section-heading">
                <div>
                  <h2>Results</h2>
                  <p>Understand the total you may receive when the FD matures.</p>
                </div>
              </div>

              <div className="summary-grid">
                <SummaryCard
                  label="Invested amount"
                  value={fdResult ? formatCurrency(fdResult.investedAmount) : "--"}
                />
                <SummaryCard
                  label="Interest earned"
                  value={fdResult ? formatCurrency(fdResult.interestEarned) : "--"}
                  accent
                />
                <SummaryCard
                  label="Maturity amount"
                  value={fdResult ? formatCurrency(fdResult.maturityAmount) : "--"}
                />
                <SummaryCard
                  label="FD period"
                  value={fdResult ? `${formatNumber(fdResult.months)} months` : "--"}
                />
              </div>

              <WhatThisMeans
                title="What this means"
                lines={
                  fdResult
                    ? [
                        `You deposit ${formatCurrency(fdResult.investedAmount)} today.`,
                        `By maturity, your gain from interest becomes ${formatCurrency(fdResult.interestEarned)}.`,
                        `So the final amount you receive is about ${formatCurrency(fdResult.maturityAmount)}.`,
                        `The table below shows when interest is actually credited based on your selected compounding frequency.`,
                      ]
                    : [
                        "Enter deposit amount, yearly FD rate, and tenure to see maturity value.",
                        "Compounding frequency matters because more frequent compounding usually gives slightly higher maturity.",
                      ]
                }
              />
              </article>
            </section>

            {fdResult ? (
              <div className="table-card">
                <div className="table-header">
                  <div>
                    <h3>Monthly FD Growth</h3>
                    <p>See FD balance and credited interest month by month, grouped by year.</p>
                  </div>
                </div>
                <FdYearlyBreakdown rows={fdYearGroups} />
              </div>
            ) : null}
          </>
        ) : null}

        {calculatorType === "fdVsLoan" ? (
          <>
            <section className="panel-grid">
              <article className="calculator-card">
              <div className="section-heading">
                <div>
                  <h2>FD vs Loan Compare</h2>
                  <p>Check whether FD earning is enough to justify taking a loan.</p>
                </div>
                <button
                  type="button"
                  className="reset-button"
                  onClick={handleResetCurrentCalculator}
                >
                  Reset
                </button>
              </div>

              <div className="form-grid">
                <InputField
                  label="FD amount (Rs)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={forms.fdVsLoan.fdAmount}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdVsLoan: {
                        ...current.fdVsLoan,
                        fdAmount: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 100000"
                />
                <InputField
                  label="FD rate (% per year)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={forms.fdVsLoan.fdRate}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdVsLoan: {
                        ...current.fdVsLoan,
                        fdRate: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 7"
                />
                <InputField
                  label="Loan amount (Rs)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={forms.fdVsLoan.loanAmount}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdVsLoan: {
                        ...current.fdVsLoan,
                        loanAmount: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 100000"
                />
                <InputField
                  label="Loan rate (% per year)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={forms.fdVsLoan.loanRate}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdVsLoan: {
                        ...current.fdVsLoan,
                        loanRate: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 10"
                />
                <InputField
                  label="Time period"
                  type="number"
                  min="0"
                  step="1"
                  value={forms.fdVsLoan.loanTenure}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdVsLoan: {
                        ...current.fdVsLoan,
                        loanTenure: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 1"
                />
                <InputField
                  label="Loan processing fee (% of loan)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={forms.fdVsLoan.loanProcessingFee}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdVsLoan: {
                        ...current.fdVsLoan,
                        loanProcessingFee: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 1"
                />
                <InputField
                  label="Extra monthly prepayment on loan (Rs)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={forms.fdVsLoan.loanMonthlyPrepayment}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      fdVsLoan: {
                        ...current.fdVsLoan,
                        loanMonthlyPrepayment: event.target.value,
                      },
                    }))
                  }
                  placeholder="Example: 1000"
                  hint="Optional. Use this if you may pay extra every month."
                />
              </div>

              <div className="toggle-stack">
                <div>
                  <span className="mini-label">Time unit</span>
                  <SegmentedToggle
                    value={forms.fdVsLoan.loanTenureUnit}
                    onChange={(value) =>
                      setForms((current) => ({
                        ...current,
                        fdVsLoan: {
                          ...current.fdVsLoan,
                          loanTenureUnit: value,
                        },
                      }))
                    }
                    options={tenureOptions}
                  />
                </div>

                <div>
                  <span className="mini-label">FD compounding</span>
                  <SegmentedToggle
                    value={forms.fdVsLoan.fdCompounding}
                    onChange={(value) =>
                      setForms((current) => ({
                        ...current,
                        fdVsLoan: {
                          ...current.fdVsLoan,
                          fdCompounding: value,
                        },
                      }))
                    }
                    options={compoundingOptions}
                  />
                </div>
              </div>

              <ErrorList errors={fdVsLoanErrors} />
            </article>

            <article className="results-card">
              <div className="section-heading">
                <div>
                  <h2>Comparison Result</h2>
                  <p>This compares FD gain with the cost of taking the loan.</p>
                </div>
              </div>

              <div className="summary-grid">
                <SummaryCard
                  label="Buy with own cash now"
                  value={
                    fdVsLoanResult
                      ? formatCurrency(fdVsLoanResult.buyWithCashCost)
                      : "--"
                  }
                />
                <SummaryCard
                  label="FD interest earned"
                  value={
                    fdVsLoanResult ? formatCurrency(fdVsLoanResult.fd.interestEarned) : "--"
                  }
                />
                <SummaryCard
                  label="Loan interest cost"
                  value={
                    fdVsLoanResult ? formatCurrency(fdVsLoanResult.loan.totalInterest) : "--"
                  }
                />
                <SummaryCard
                  label="Loan fee"
                  value={
                    fdVsLoanResult
                      ? formatCurrency(fdVsLoanResult.loan.processingFeeAmount)
                      : "--"
                  }
                />
                <SummaryCard
                  label="Net difference"
                  value={
                    fdVsLoanResult
                      ? formatCurrency(fdVsLoanResult.netDifference)
                      : "--"
                  }
                  accent
                />
              </div>

              <WhatThisMeans
                title="What this means"
                  lines={
                    fdVsLoanResult
                      ? [
                        `Option 1: buy using your own money now. You pay ${formatCurrency(fdVsLoanResult.buyWithCashCost)} today and there is no loan cost.`,
                        `Option 2: keep that money in FD and take the loan. Your FD earns about ${formatCurrency(fdVsLoanResult.fd.interestEarned)}, while the loan costs about ${formatCurrency(fdVsLoanResult.loan.totalInterest + fdVsLoanResult.loan.processingFeeAmount)} including fee.`,
                        fdVsLoanResult.betterChoice === "fd"
                          ? `The FD return is higher by ${formatCurrency(fdVsLoanResult.netDifference)}. On pure numbers, taking the loan and keeping the money invested works better here.`
                          : fdVsLoanResult.betterChoice === "loan"
                            ? `The loan costs more than the FD earns by ${formatCurrency(Math.abs(fdVsLoanResult.netDifference))}. In simple terms, full payment from your own money is usually the better decision here.`
                            : "Both options are almost equal on pure money cost for this period.",
                      ]
                    : [
                        "This tool is best when you want to compare one FD against one loan for the same time period.",
                        "Example: compare Rs 1,00,000 FD at 7% with Rs 1,00,000 loan at 10% for 1 year.",
                      ]
                }
              />
              </article>
            </section>

            {fdVsLoanResult ? (
              <div className="table-card">
                <div className="table-header">
                  <div>
                    <h3>FD vs Loan Breakdown</h3>
                    <p>See FD growth and loan repayment together in one combined timeline.</p>
                  </div>
                </div>
                <CombinedFdLoanBreakdown
                  fdRows={groupByYear(fdVsLoanResult.fd.growth)}
                  loanRows={groupByYear(fdVsLoanResult.loan.schedule)}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
