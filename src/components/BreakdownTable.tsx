import type { BreakdownRow, CalculationMode } from "../types";
import { formatCurrency, formatNumber } from "../utils/calculator";

interface BreakdownTableProps {
  rows: BreakdownRow[];
  mode: CalculationMode;
}

export function BreakdownTable({ rows, mode }: BreakdownTableProps) {
  return (
    <div className="table-card">
      <div className="table-header">
        <div>
          <h3>Interest Breakdown</h3>
          <p>
            {mode === "simple"
              ? "Month-by-month simple interest view"
              : "Year-by-year compound growth view"}
          </p>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Opening amount</th>
              <th>Interest</th>
              <th>Closing amount</th>
              <th>Time used</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{formatCurrency(row.openingBalance)}</td>
                <td>{formatCurrency(row.interest)}</td>
                <td>{formatCurrency(row.closingBalance)}</td>
                <td>{formatNumber(row.elapsedYears)} yr</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
