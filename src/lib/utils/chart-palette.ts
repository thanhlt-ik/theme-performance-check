/**
 * Fixed-order categorical palette for comparing multiple products on one chart.
 * Order is the CVD-safety mechanism (validated on the adjacent-pairlist for
 * line charts) — never reassign by selection order, always by each product's
 * stable position in the full product list, so deselecting one series never
 * repaints the others.
 */
const CATEGORICAL_LIGHT = [
  '#2a78d6', // blue
  '#008300', // green
  '#e87ba4', // magenta
  '#eda100', // yellow
  '#1baf7a', // aqua
  '#eb6834', // orange
  '#4a3aa7', // violet
  '#e34948', // red
];

const CATEGORICAL_DARK = [
  '#3987e5',
  '#008300',
  '#d55181',
  '#c98500',
  '#199e70',
  '#d95926',
  '#9085e9',
  '#e66767',
];

export function categoricalColor(index: number, theme: 'light' | 'dark'): string {
  const palette = theme === 'dark' ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  return palette[index % palette.length];
}
