interface SummaryCardProps {
  label: string;
  value: string;
  accent?: boolean;
}

export function SummaryCard({ label, value, accent = false }: SummaryCardProps) {
  return (
    <article className={`summary-card${accent ? " accent" : ""}`}>
      <p className="summary-label">{label}</p>
      <strong className="summary-value">{value}</strong>
    </article>
  );
}
