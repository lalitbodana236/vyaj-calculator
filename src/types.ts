export type CalculationMode = "simple" | "compound";
export type RateInputMode = "yearlyPercent" | "monthlyPerHundred";
export type ThemeMode = "light" | "dark";

export interface FormValues {
  principal: string;
  rate: string;
  startDate: string;
  endDate: string;
}

export interface BreakdownRow {
  label: string;
  openingBalance: number;
  interest: number;
  closingBalance: number;
  elapsedYears: number;
}

export interface CalculationSummary {
  ratePercent: number;
  durationYears: number;
  durationMonths: number;
  totalInterest: number;
  finalAmount: number;
  breakdown: BreakdownRow[];
}

export interface PersistedState {
  calculationMode: CalculationMode;
  rateInputMode: RateInputMode;
  formValues: FormValues;
  themeMode: ThemeMode;
}
