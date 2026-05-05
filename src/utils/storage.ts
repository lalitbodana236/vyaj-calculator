import type {
  CalculatorForms,
  CalculationMode,
  CalculatorType,
  CompoundingFrequency,
  PersistedState,
  RateInputMode,
  ThemeMode,
} from "../types";

const STORAGE_KEY = "vyaj-calculator:last-calculation";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nextMonthDate() {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return nextMonth.toISOString().slice(0, 10);
}

function isCalculatorType(value: unknown): value is CalculatorType {
  return (
    value === "interest" ||
    value === "stockAverage" ||
    value === "loan" ||
    value === "fdInterest" ||
    value === "fdVsLoan"
  );
}

function isCalculationMode(value: unknown): value is CalculationMode {
  return value === "simple" || value === "compound";
}

function isRateInputMode(value: unknown): value is RateInputMode {
  return value === "yearlyPercent" || value === "monthlyPerHundred";
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isCompoundingFrequency(value: unknown): value is CompoundingFrequency {
  return (
    value === "monthly" ||
    value === "quarterly" ||
    value === "halfYearly" ||
    value === "yearly"
  );
}

function defaultForms(): CalculatorForms {
  return {
    interest: {
      principal: "100000",
      rate: "2",
      startDate: todayDate(),
      endDate: nextMonthDate(),
    },
    stockAverage: {
      rows: [
        { id: "row-1", price: "100", quantity: "10" },
        { id: "row-2", price: "90", quantity: "15" },
      ],
      marketPrice: "110",
    },
    loan: {
      amount: "100000",
      rate: "10",
      tenure: "12",
      tenureUnit: "months",
      processingFee: "1",
      monthlyPrepayment: "0",
      prepaymentMonths: "0",
    },
    fdInterest: {
      amount: "100000",
      rate: "7",
      tenure: "1",
      tenureUnit: "years",
      compounding: "quarterly",
    },
    fdVsLoan: {
      fdAmount: "100000",
      fdRate: "7",
      fdCompounding: "quarterly",
      loanAmount: "100000",
      loanRate: "10",
      loanTenure: "1",
      loanTenureUnit: "years",
      loanProcessingFee: "1",
      loanMonthlyPrepayment: "0",
    },
  };
}

export function createInitialState(): PersistedState {
  return {
    calculatorType: "interest",
    calculationMode: "simple",
    rateInputMode: "monthlyPerHundred",
    forms: defaultForms(),
    themeMode: "light",
  };
}

export function loadSavedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState> & {
      formValues?: PersistedState["forms"]["interest"];
    };
    const initial = createInitialState();

    const forms = parsed.forms ?? initial.forms;

    return {
      calculatorType: isCalculatorType(parsed.calculatorType)
        ? parsed.calculatorType
        : initial.calculatorType,
      calculationMode: isCalculationMode(parsed.calculationMode)
        ? parsed.calculationMode
        : initial.calculationMode,
      rateInputMode: isRateInputMode(parsed.rateInputMode)
        ? parsed.rateInputMode
        : initial.rateInputMode,
      themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : initial.themeMode,
      forms: {
        interest: {
          principal:
            forms.interest?.principal ?? parsed.formValues?.principal ?? initial.forms.interest.principal,
          rate: forms.interest?.rate ?? parsed.formValues?.rate ?? initial.forms.interest.rate,
          startDate:
            forms.interest?.startDate ??
            parsed.formValues?.startDate ??
            initial.forms.interest.startDate,
          endDate:
            forms.interest?.endDate ?? parsed.formValues?.endDate ?? initial.forms.interest.endDate,
        },
        stockAverage: {
          rows:
            forms.stockAverage?.rows?.filter(
              (row) =>
                typeof row?.id === "string" &&
                typeof row?.price === "string" &&
                typeof row?.quantity === "string",
            ) ?? initial.forms.stockAverage.rows,
          marketPrice:
            forms.stockAverage?.marketPrice ?? initial.forms.stockAverage.marketPrice,
        },
        loan: {
          amount: forms.loan?.amount ?? initial.forms.loan.amount,
          rate: forms.loan?.rate ?? initial.forms.loan.rate,
          tenure: forms.loan?.tenure ?? initial.forms.loan.tenure,
          tenureUnit:
            forms.loan?.tenureUnit === "years" ? "years" : initial.forms.loan.tenureUnit,
          processingFee:
            forms.loan?.processingFee ?? initial.forms.loan.processingFee,
          monthlyPrepayment:
            forms.loan?.monthlyPrepayment ?? initial.forms.loan.monthlyPrepayment,
          prepaymentMonths:
            forms.loan?.prepaymentMonths ?? initial.forms.loan.prepaymentMonths,
        },
        fdInterest: {
          amount: forms.fdInterest?.amount ?? initial.forms.fdInterest.amount,
          rate: forms.fdInterest?.rate ?? initial.forms.fdInterest.rate,
          tenure: forms.fdInterest?.tenure ?? initial.forms.fdInterest.tenure,
          tenureUnit:
            forms.fdInterest?.tenureUnit === "months" || forms.fdInterest?.tenureUnit === "years"
              ? forms.fdInterest.tenureUnit
              : initial.forms.fdInterest.tenureUnit,
          compounding: isCompoundingFrequency(forms.fdInterest?.compounding)
            ? forms.fdInterest.compounding
            : initial.forms.fdInterest.compounding,
        },
        fdVsLoan: {
          fdAmount: forms.fdVsLoan?.fdAmount ?? initial.forms.fdVsLoan.fdAmount,
          fdRate: forms.fdVsLoan?.fdRate ?? initial.forms.fdVsLoan.fdRate,
          fdCompounding: isCompoundingFrequency(forms.fdVsLoan?.fdCompounding)
            ? forms.fdVsLoan.fdCompounding
            : initial.forms.fdVsLoan.fdCompounding,
          loanAmount: forms.fdVsLoan?.loanAmount ?? initial.forms.fdVsLoan.loanAmount,
          loanRate: forms.fdVsLoan?.loanRate ?? initial.forms.fdVsLoan.loanRate,
          loanTenure: forms.fdVsLoan?.loanTenure ?? initial.forms.fdVsLoan.loanTenure,
          loanTenureUnit:
            forms.fdVsLoan?.loanTenureUnit === "years" ||
            forms.fdVsLoan?.loanTenureUnit === "months"
              ? forms.fdVsLoan.loanTenureUnit
              : initial.forms.fdVsLoan.loanTenureUnit,
          loanProcessingFee:
            forms.fdVsLoan?.loanProcessingFee ?? initial.forms.fdVsLoan.loanProcessingFee,
          loanMonthlyPrepayment:
            forms.fdVsLoan?.loanMonthlyPrepayment ??
            initial.forms.fdVsLoan.loanMonthlyPrepayment,
        },
      },
    } satisfies PersistedState;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures so the calculator remains usable.
  }
}
