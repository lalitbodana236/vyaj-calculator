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
          <h3>Breakdown / विवरण</h3>
          <p>
            {mode === "simple"
              ? "Monthly simple interest view"
              : "Year-wise compound growth view"}
          </p>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Period / अवधि</th>
              <th>Opening / शुरुआती राशि</th>
              <th>Interest / ब्याज</th>
              <th>Closing / कुल राशि</th>
              <th>Time</th>
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
