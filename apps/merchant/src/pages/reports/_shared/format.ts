// Formatting helpers shared by the five Pattern-F report pages. Mock data
// stores raw numbers so the date-range Segmented can rescale KPI strips
// without hand-authoring five pre-formatted strings per metric.

export function formatSAR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `SAR ${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `SAR ${(amount / 1_000).toFixed(1)}K`;
  return `SAR ${amount.toFixed(2)}`;
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
