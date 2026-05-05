import type {
  BreakdownRow,
  CalculationMode,
  CalculationSummary,
  CompoundingFrequency,
  FdFormValues,
  FdSummary,
  FdVsLoanFormValues,
  FdVsLoanSummary,
  InterestFormValues,
  LoanFormValues,
  LoanScheduleRow,
  LoanSummary,
  RateInputMode,
  StockAverageFormValues,
  StockAverageSummary,
  TenureUnit,
} from "../types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function parsePositiveNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
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

export function getInterestValidationErrors(values: InterestFormValues): string[] {
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
  values: InterestFormValues,
  calculationMode: CalculationMode,
  rateInputMode: RateInputMode,
): CalculationSummary | null {
  const errors = getInterestValidationErrors(values);
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

export function getStockAverageValidationErrors(values: StockAverageFormValues): string[] {
  const validRows = values.rows.filter((row) => row.price || row.quantity);
  const errors: string[] = [];

  if (validRows.length === 0) {
    errors.push("Add at least one buy entry with price and quantity.");
  }

  validRows.forEach((row, index) => {
    const price = parsePositiveNumber(row.price);
    const quantity = parsePositiveNumber(row.quantity);

    if (!row.price || !row.quantity) {
      errors.push(`Row ${index + 1}: please enter both buy price and quantity.`);
      return;
    }

    if (!(price > 0)) {
      errors.push(`Row ${index + 1}: buy price must be more than 0.`);
    }

    if (!(quantity > 0)) {
      errors.push(`Row ${index + 1}: quantity must be more than 0.`);
    }
  });

  if (values.marketPrice) {
    const marketPrice = parsePositiveNumber(values.marketPrice);
    if (!(marketPrice >= 0)) {
      errors.push("Current market price cannot be negative.");
    }
  }

  return errors;
}

export function calculateStockAverage(
  values: StockAverageFormValues,
): StockAverageSummary | null {
  const errors = getStockAverageValidationErrors(values);
  if (errors.length > 0) {
    return null;
  }

  const rows = values.rows.filter((row) => row.price && row.quantity);
  const totalInvestment = rows.reduce(
    (sum, row) => sum + parsePositiveNumber(row.price) * parsePositiveNumber(row.quantity),
    0,
  );
  const totalShares = rows.reduce((sum, row) => sum + parsePositiveNumber(row.quantity), 0);
  const averagePrice = totalInvestment / totalShares;
  const marketPrice = values.marketPrice ? parsePositiveNumber(values.marketPrice) : averagePrice;
  const marketValue = totalShares * marketPrice;
  const profitOrLoss = marketValue - totalInvestment;
  const profitOrLossPercent = totalInvestment === 0 ? 0 : (profitOrLoss / totalInvestment) * 100;

  return {
    totalInvestment,
    totalShares,
    averagePrice,
    marketValue,
    profitOrLoss,
    profitOrLossPercent,
  };
}

function tenureToMonths(tenure: number, unit: TenureUnit) {
  return unit === "years" ? tenure * 12 : tenure;
}

function compoundingPerYear(frequency: CompoundingFrequency) {
  if (frequency === "monthly") return 12;
  if (frequency === "quarterly") return 4;
  if (frequency === "halfYearly") return 2;
  return 1;
}

function monthsPerCreditPeriod(frequency: CompoundingFrequency) {
  if (frequency === "monthly") return 1;
  if (frequency === "quarterly") return 3;
  if (frequency === "halfYearly") return 6;
  return 12;
}

export function getLoanValidationErrors(values: LoanFormValues): string[] {
  const amount = parsePositiveNumber(values.amount);
  const rate = parsePositiveNumber(values.rate);
  const tenure = parsePositiveNumber(values.tenure);
  const fee = parsePositiveNumber(values.processingFee || "0");
  const monthlyPrepayment = parsePositiveNumber(values.monthlyPrepayment || "0");
  const prepaymentMonths = parsePositiveNumber(values.prepaymentMonths || "0");
  const errors: string[] = [];

  if (!values.amount || !values.rate || !values.tenure) {
    errors.push("Please enter loan amount, interest rate, and tenure.");
  }

  if (!(amount > 0)) {
    errors.push("Loan amount must be more than 0.");
  }

  if (!(rate >= 0)) {
    errors.push("Loan interest rate cannot be negative.");
  }

  if (!(tenure > 0)) {
    errors.push("Loan tenure must be more than 0.");
  }

  if (!(fee >= 0)) {
    errors.push("Processing fee cannot be negative.");
  }

  if (!(monthlyPrepayment >= 0)) {
    errors.push("Monthly prepayment cannot be negative.");
  }

  if (!(prepaymentMonths >= 0)) {
    errors.push("Prepayment months cannot be negative.");
  }

  return errors;
}

function createLoanSchedule(
  amount: number,
  annualRate: number,
  emi: number,
  months: number,
  monthlyPrepayment: number,
  prepaymentMonths: number,
): LoanScheduleRow[] {
  const schedule: LoanScheduleRow[] = [];
  let balance = amount;
  let cumulativeInterestPaid = 0;
  const monthlyRate = annualRate / 12 / 100;

  for (let month = 1; month <= months && balance > 0.01; month += 1) {
    const openingBalance = balance;
    const interestPaid = monthlyRate === 0 ? 0 : openingBalance * monthlyRate;
    const scheduledPrincipal = monthlyRate === 0 ? emi : emi - interestPaid;
    const activePrepayment = month <= prepaymentMonths ? monthlyPrepayment : 0;
    const maxPrincipalPossible = openingBalance;
    const totalPrincipalPaid = Math.min(
      maxPrincipalPossible,
      scheduledPrincipal + activePrepayment,
    );
    const actualPrepayment = Math.max(0, totalPrincipalPaid - scheduledPrincipal);
    const totalPayment = interestPaid + totalPrincipalPaid;
    balance = Math.max(0, openingBalance - totalPrincipalPaid);
    cumulativeInterestPaid += interestPaid;

    schedule.push({
      month,
      emi,
      prepayment: actualPrepayment,
      totalPayment,
      principalPaid: totalPrincipalPaid,
      interestPaid,
      cumulativeInterestPaid,
      remainingBalance: balance,
    });
  }

  return schedule;
}

export function calculateLoan(values: LoanFormValues): LoanSummary | null {
  const errors = getLoanValidationErrors(values);
  if (errors.length > 0) {
    return null;
  }

  const amount = parsePositiveNumber(values.amount);
  const annualRate = parsePositiveNumber(values.rate);
  const baseMonths = Math.round(
    tenureToMonths(parsePositiveNumber(values.tenure), values.tenureUnit),
  );
  const processingFeePercent = parsePositiveNumber(values.processingFee || "0");
  const monthlyPrepayment = parsePositiveNumber(values.monthlyPrepayment || "0");
  const prepaymentMonths = Math.min(
    baseMonths,
    Math.round(parsePositiveNumber(values.prepaymentMonths || "0")),
  );
  const monthlyRate = annualRate / 12 / 100;
  const monthlyEmi =
    monthlyRate === 0
      ? amount / baseMonths
      : (amount * monthlyRate * (1 + monthlyRate) ** baseMonths) /
        ((1 + monthlyRate) ** baseMonths - 1);
  const baseSchedule = createLoanSchedule(amount, annualRate, monthlyEmi, baseMonths + 240, 0, 0);
  const schedule = createLoanSchedule(
    amount,
    annualRate,
    monthlyEmi,
    baseMonths + 240,
    monthlyPrepayment,
    prepaymentMonths,
  );
  const baseInterest = baseSchedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const totalRepayment = schedule.reduce((sum, row) => sum + row.totalPayment, 0);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const interestSaved = Math.max(0, baseInterest - totalInterest);
  const processingFeeAmount = (amount * processingFeePercent) / 100;
  const totalCost = totalRepayment + processingFeeAmount;
  const monthsSaved = Math.max(0, baseMonths - schedule.length);
  const monthsLeftAfterPrepaymentPeriod = Math.max(0, schedule.length - prepaymentMonths);

  return {
    monthlyEmi,
    totalInterest,
    interestSaved,
    totalRepayment,
    processingFeeAmount,
    totalCost,
    months: schedule.length,
    baseMonths,
    monthlyPrepayment,
    prepaymentMonths,
    monthsSaved,
    monthsLeftAfterPrepaymentPeriod,
    schedule,
  };
}

export function getFdValidationErrors(values: FdFormValues): string[] {
  const amount = parsePositiveNumber(values.amount);
  const rate = parsePositiveNumber(values.rate);
  const tenure = parsePositiveNumber(values.tenure);
  const errors: string[] = [];

  if (!values.amount || !values.rate || !values.tenure) {
    errors.push("Please enter deposit amount, interest rate, and tenure.");
  }

  if (!(amount > 0)) {
    errors.push("Deposit amount must be more than 0.");
  }

  if (!(rate >= 0)) {
    errors.push("FD interest rate cannot be negative.");
  }

  if (!(tenure > 0)) {
    errors.push("FD tenure must be more than 0.");
  }

  return errors;
}

export function calculateFd(values: FdFormValues): FdSummary | null {
  const errors = getFdValidationErrors(values);
  if (errors.length > 0) {
    return null;
  }

  const investedAmount = parsePositiveNumber(values.amount);
  const annualRate = parsePositiveNumber(values.rate);
  const months = tenureToMonths(parsePositiveNumber(values.tenure), values.tenureUnit);
  const years = months / 12;
  const perYear = compoundingPerYear(values.compounding);
  const creditEveryMonths = monthsPerCreditPeriod(values.compounding);
  const maturityAmount =
    investedAmount * (1 + annualRate / 100 / perYear) ** (perYear * years);
  const interestEarned = maturityAmount - investedAmount;
  const roundedMonths = Math.round(months);
  const growth = [];
  let runningBalance = investedAmount;
  const periodRate = annualRate / 100 / perYear;
  let cumulativeInterestEarned = 0;

  for (let month = 1; month <= roundedMonths; month += 1) {
    const openingBalance = runningBalance;
    const isCreditMonth =
      month % creditEveryMonths === 0 || month === roundedMonths;
    const targetBalance = isCreditMonth
      ? investedAmount * (1 + periodRate) ** (perYear * (month / 12))
      : openingBalance;
    const interestForMonth = isCreditMonth ? targetBalance - openingBalance : 0;
    runningBalance = targetBalance;
    cumulativeInterestEarned += interestForMonth;
    growth.push({
      month,
      openingBalance,
      interestEarned: interestForMonth,
      cumulativeInterestEarned,
      closingBalance: runningBalance,
    });
  }

  return {
    investedAmount,
    maturityAmount,
    interestEarned,
    months,
    annualRate,
    growth,
  };
}

export function getFdVsLoanValidationErrors(values: FdVsLoanFormValues): string[] {
  const fdErrors = getFdValidationErrors({
    amount: values.fdAmount,
    rate: values.fdRate,
    tenure: values.loanTenure,
    tenureUnit: values.loanTenureUnit,
    compounding: values.fdCompounding,
  });

  const loanErrors = getLoanValidationErrors({
    amount: values.loanAmount,
    rate: values.loanRate,
    tenure: values.loanTenure,
    tenureUnit: values.loanTenureUnit,
    processingFee: values.loanProcessingFee,
    monthlyPrepayment: values.loanMonthlyPrepayment,
    prepaymentMonths: values.loanTenure,
  });

  return [...fdErrors, ...loanErrors];
}

export function calculateFdVsLoan(values: FdVsLoanFormValues): FdVsLoanSummary | null {
  const errors = getFdVsLoanValidationErrors(values);
  if (errors.length > 0) {
    return null;
  }

  const fd = calculateFd({
    amount: values.fdAmount,
    rate: values.fdRate,
    tenure: values.loanTenure,
    tenureUnit: values.loanTenureUnit,
    compounding: values.fdCompounding,
  });
  const loan = calculateLoan({
    amount: values.loanAmount,
    rate: values.loanRate,
    tenure: values.loanTenure,
    tenureUnit: values.loanTenureUnit,
    processingFee: values.loanProcessingFee,
    monthlyPrepayment: values.loanMonthlyPrepayment,
    prepaymentMonths: values.loanTenure,
  });

  if (!fd || !loan) {
    return null;
  }

  const netDifference = fd.interestEarned - (loan.totalInterest + loan.processingFeeAmount);
  const betterChoice =
    netDifference > 0 ? "fd" : netDifference < 0 ? "loan" : "equal";
  const buyWithCashCost = parsePositiveNumber(values.loanAmount);
  const investAndBorrowNetWorth =
    fd.maturityAmount - (loan.totalRepayment + loan.processingFeeAmount);

  return {
    fd,
    loan,
    netDifference,
    betterChoice,
    buyWithCashCost,
    investAndBorrowNetWorth,
  };
}
