interface SummaryCardProps {
  label: string;
  value: string;
  accent?: boolean;
}

export function SummaryCard({ label, value, accent = false }: SummaryCardProps) {
  return (
    <article className={`summary-card${accent ? " accent" : ""}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
