// Small helpers for numbers, units and colours.

export function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function signed(text, value) {
  return value > 0 ? `+${text}` : text;
}

export function percentChange(from, to) {
  if (from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

// "+485%" for big changes, "+4.9%" for small ones.
export function formatPercentChange(change) {
  if (change === null) return '—';
  const decimals = Math.abs(change) >= 100 ? 0 : 1;
  return `${change > 0 ? '+' : ''}${change.toFixed(decimals)}%`;
}

// "2025-01-14" → "14 Jan 2025"
export function formatIsoDate(isoDate, months) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

// { lat: 24.799, lng: 46.598 } → "24.80°N 46.60°E"
export function formatCoordinates({ lat, lng }, strings) {
  const { north, south, east, west } = strings.compass;
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? north : south} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? east : west}`;
}

// ---------- Temperature ----------

export function convertTemperature(celsius, unit) {
  return unit === 'F' ? (celsius * 9) / 5 + 32 : celsius;
}

export function temperatureSymbol(unit) {
  return unit === 'F' ? '°F' : '°C';
}

// A card's °C value (or °C difference) in the unit chosen in settings.
export function toUnit(value, metric, unit) {
  if (!isNumber(value) || !metric.temperature) return value;
  if (metric.temperature === 'difference') return unit === 'F' ? (value * 9) / 5 : value;
  return convertTemperature(value, unit);
}

// Green when the change goes the good way for that card.
export function toneFor(metric, change) {
  if (!change) return 'neutral';
  return change > 0 === metric.increaseIsPositive ? 'positive' : 'negative';
}

// ---------- Colour palettes ----------
// A palette is a sorted list of { value, color: '#rrggbb' } stops.

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// [r, g, b] for a value, blended between the two nearest stops.
export function rgbAt(stops, value) {
  if (value <= stops[0].value) return hexToRgb(stops[0].color);
  const last = stops[stops.length - 1];
  if (value >= last.value) return hexToRgb(last.color);

  const upper = stops.findIndex((stop) => stop.value >= value);
  const from = stops[upper - 1];
  const to = stops[upper];
  const t = (value - from.value) / (to.value - from.value);
  const a = hexToRgb(from.color);
  const b = hexToRgb(to.color);
  return a.map((c, i) => c + (b[i] - c) * t);
}

export function colorAt(stops, value) {
  return `#${rgbAt(stops, value)
    .map((c) => Math.round(c).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function paletteGradient(stops, from, to, steps = 12) {
  const parts = Array.from({ length: steps + 1 }, (_, i) => {
    const value = from + ((to - from) * i) / steps;
    return `${colorAt(stops, value)} ${((i / steps) * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${parts.join(', ')})`;
}
