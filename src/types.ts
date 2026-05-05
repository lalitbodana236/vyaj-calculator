export type CalculationMode = "simple" | "compound";
export type RateInputMode = "yearlyPercent" | "monthlyPerHundred";
export type ThemeMode = "light" | "dark";
export type CalculatorType =
  | "interest"
  | "stockAverage"
  | "loan"
  | "fdInterest"
  | "fdVsLoan";
export type TenureUnit = "months" | "years";
export type CompoundingFrequency = "monthly" | "quarterly" | "halfYearly" | "yearly";

export interface InterestFormValues {
  principal: string;
  rate: string;
  startDate: string;
  endDate: string;
}

export interface StockAverageRow {
  id: string;
  price: string;
  quantity: string;
}

export interface StockAverageFormValues {
  rows: StockAverageRow[];
  marketPrice: string;
}

export interface LoanFormValues {
  amount: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
  processingFee: string;
  monthlyPrepayment: string;
  prepaymentMonths: string;
}

export interface FdFormValues {
  amount: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
  compounding: CompoundingFrequency;
}

export interface FdVsLoanFormValues {
  fdAmount: string;
  fdRate: string;
  fdCompounding: CompoundingFrequency;
  loanAmount: string;
  loanRate: string;
  loanTenure: string;
  loanTenureUnit: TenureUnit;
  loanProcessingFee: string;
  loanMonthlyPrepayment: string;
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

export interface StockAverageSummary {
  totalInvestment: number;
  totalShares: number;
  averagePrice: number;
  marketValue: number;
  profitOrLoss: number;
  profitOrLossPercent: number;
}

export interface LoanScheduleRow {
  month: number;
  emi: number;
  prepayment: number;
  totalPayment: number;
  principalPaid: number;
  interestPaid: number;
  cumulativeInterestPaid: number;
  remainingBalance: number;
}

export interface LoanSummary {
  monthlyEmi: number;
  totalInterest: number;
  interestSaved: number;
  totalRepayment: number;
  processingFeeAmount: number;
  totalCost: number;
  months: number;
  baseMonths: number;
  monthlyPrepayment: number;
  prepaymentMonths: number;
  monthsSaved: number;
  monthsLeftAfterPrepaymentPeriod: number;
  schedule: LoanScheduleRow[];
}

export interface FdSummary {
  investedAmount: number;
  maturityAmount: number;
  interestEarned: number;
  months: number;
  annualRate: number;
  growth: Array<{
    month: number;
    openingBalance: number;
    interestEarned: number;
    cumulativeInterestEarned: number;
    closingBalance: number;
  }>;
}

export interface FdVsLoanSummary {
  fd: FdSummary;
  loan: LoanSummary;
  netDifference: number;
  betterChoice: "fd" | "loan" | "equal";
  buyWithCashCost: number;
  investAndBorrowNetWorth: number;
}

export interface CalculatorForms {
  interest: InterestFormValues;
  stockAverage: StockAverageFormValues;
  loan: LoanFormValues;
  fdInterest: FdFormValues;
  fdVsLoan: FdVsLoanFormValues;
}

export interface PersistedState {
  calculatorType: CalculatorType;
  calculationMode: CalculationMode;
  rateInputMode: RateInputMode;
  forms: CalculatorForms;
  themeMode: ThemeMode;
}
