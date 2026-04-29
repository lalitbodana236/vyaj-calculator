import type {
  BreakdownRow,
  CalculationMode,
  CalculationSummary,
  FormValues,
  RateInputMode,
} from "../types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function parsePositiveNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function getValidationErrors(values: FormValues): string[] {
  const errors: string[] = [];
  const principal = parsePositiveNumber(values.principal);
  const rate = parsePositiveNumber(values.rate);

  if (!values.principal || !values.rate || !values.startDate || !values.endDate) {
    errors.push("Please complete all required fields.");
  }

  if (values.principal && principal < 0) {
    errors.push("Principal amount cannot be negative.");
  }

  if (values.rate && rate < 0) {
    errors.push("Interest rate cannot be negative.");
  }

  if (values.startDate && values.endDate) {
    const start = new Date(values.startDate);
    const end = new Date(values.endDate);

    if (end < start) {
      errors.push("End date must be on or after the start date.");
    }
  }

  return errors;
}

export function getDurationMetrics(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(0, (end.getTime() - start.getTime()) / DAY_IN_MS);
  const durationYears = diffDays / 365;
  const durationMonths = diffDays / (365 / 12);

  return {
    diffDays,
    durationYears,
    durationMonths,
  };
}

export function toYearlyRatePercent(rate: number, mode: RateInputMode) {
  return mode === "yearlyPercent" ? rate : rate * 12;
}

function createSimpleBreakdown(
  principal: number,
  yearlyRatePercent: number,
  durationMonths: number,
): BreakdownRow[] {
  const months = Math.max(1, Math.ceil(durationMonths));
  const rows: BreakdownRow[] = [];

  for (let monthIndex = 1; monthIndex <= months; monthIndex += 1) {
    const elapsedYears = monthIndex / 12;
    const interest = (principal * yearlyRatePercent * elapsedYears) / 100;
    rows.push({
      label: `Month ${monthIndex}`,
      openingBalance: principal,
      interest,
      closingBalance: principal + interest,
      elapsedYears,
    });
  }

  return rows;
}

function createCompoundBreakdown(
  principal: number,
  yearlyRatePercent: number,
  durationYears: number,
): BreakdownRow[] {
  const years = Math.max(1, Math.ceil(durationYears));
  const rows: BreakdownRow[] = [];

  for (let yearIndex = 1; yearIndex <= years; yearIndex += 1) {
    const elapsedYears = Math.min(yearIndex, durationYears);
    const previousYears = Math.max(0, elapsedYears - 1);
    const openingBalance = principal * (1 + yearlyRatePercent / 100) ** previousYears;
    const closingBalance = principal * (1 + yearlyRatePercent / 100) ** elapsedYears;
    rows.push({
      label: `Year ${yearIndex}`,
      openingBalance,
      interest: closingBalance - openingBalance,
      closingBalance,
      elapsedYears,
    });
  }

  return rows;
}

export function calculateInterest(
  values: FormValues,
  calculationMode: CalculationMode,
  rateInputMode: RateInputMode,
): CalculationSummary | null {
  const errors = getValidationErrors(values);
  if (errors.length > 0) {
    return null;
  }

  const principal = parsePositiveNumber(values.principal);
  const rawRate = parsePositiveNumber(values.rate);
  const { durationYears, durationMonths } = getDurationMetrics(values.startDate, values.endDate);
  const ratePercent = toYearlyRatePercent(rawRate, rateInputMode);

  let totalInterest = 0;
  let finalAmount = principal;

  if (calculationMode === "simple") {
    totalInterest = (principal * ratePercent * durationYears) / 100;
    finalAmount = principal + totalInterest;
  } else {
    finalAmount = principal * (1 + ratePercent / 100) ** durationYears;
    totalInterest = finalAmount - principal;
  }

  const breakdown =
    calculationMode === "simple"
      ? createSimpleBreakdown(principal, ratePercent, durationMonths)
      : createCompoundBreakdown(principal, ratePercent, durationYears);

  return {
    ratePercent,
    durationYears,
    durationMonths,
    totalInterest,
    finalAmount,
    breakdown,
  };
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits,
  }).format(value);
}
