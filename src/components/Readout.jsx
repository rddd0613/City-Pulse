// The readout under the map: one card per value, comparing the two years.
import { Icon } from '../icons';
import { fillTemplate } from '../i18n';
import { useSettings } from '../settings';
import { formatPercentChange, isNumber, percentChange, signed, temperatureSymbol, toneFor, toUnit } from '../utils';

const NO_VALUE = '—';

// Values that use the yearly land-cover map (it ends in 2024).
const LAND_COVER_VALUES = ['urbanPercent', 'heatIsland'];

// 13.42 → "13:25"
function formatHour(hours) {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

function MetricCard({ metric, baseline, target }) {
  const { strings, settings } = useSettings();
  const unitChoice = settings.temperatureUnit;
  const symbol = temperatureSymbol(unitChoice);

  const from = toUnit(baseline.values[metric.valueId], metric, unitChoice);
  const to = toUnit(target.values[metric.valueId], metric, unitChoice);
  const hasBoth = isNumber(from) && isNumber(to);
  const percent = hasBoth ? percentChange(from, to) : null;
  const delta = hasBoth ? to - from : null;
  const tone = toneFor(metric, metric.change === 'temperatureDelta' ? delta : percent);

  const unit = metric.temperature ? (metric.temperature === 'difference' ? '°' : symbol) : (metric.unit ?? '');
  const captionUnit = metric.temperature ? (metric.fullUnitInCaption ? symbol : '°') : (metric.unit ?? '');
  const iconName = metric.icon === 'trend' ? (percent < 0 ? 'trendDown' : 'trendUp') : metric.icon;
  const iconTone = metric.icon === 'trend' ? tone : (metric.iconTone ?? 'accent');

  // Main figure: the target year's value, or the % change for 'change' cards.
  let value;
  if (metric.display === 'change') {
    value = (
      <span dir="ltr">
        {percent === null ? NO_VALUE : signed(percent.toFixed(1), percent)}
        {percent !== null && <span className="metric-card__unit">%</span>}
      </span>
    );
  } else if (!isNumber(to)) {
    value = NO_VALUE;
  } else {
    const number = to.toFixed(metric.decimals);
    value = (
      <span dir="ltr">
        {metric.signed ? signed(number, to) : number}
        {unit && <span className="metric-card__unit">{unit}</span>}
      </span>
    );
  }

  // Change line
  let change = null;
  if (metric.display !== 'change') {
    if (metric.change === 'temperatureDelta') {
      const rounded = delta === null ? null : Math.round(delta * 10) / 10 || 0;
      change = rounded === null ? NO_VALUE : `${signed(rounded.toFixed(1), rounded)}${symbol}`;
    } else {
      change = formatPercentChange(percent);
    }
  }

  let caption;
  const captionKey = metric.caption ?? 'from';
  if (captionKey === 'from') {
    caption = isNumber(from) && (
      <>
        {strings.from}{' '}
        <span dir="ltr">
          {from.toFixed(metric.decimals)}
          {captionUnit}
        </span>
      </>
    );
  } else if (captionKey === 'vsYear') {
    caption = fillTemplate(strings.captions.vsYear, { year: baseline.year, shortYear: String(baseline.year).slice(-2) });
  } else {
    const text = strings.captions[captionKey];
    caption =
      typeof text === 'string' ? (
        text
      ) : (
        <>
          <span className="tone-accent">{text.highlight}</span> {text.rest}
        </>
      );
  }

  return (
    <article className="metric-card">
      <header className="metric-card__header">
        <h3 className="metric-card__label">{strings.metrics[metric.id]}</h3>
        <Icon name={iconName} size={20} className={`metric-card__icon tone-${iconTone}`} />
      </header>

      <p className="metric-card__value">{value}</p>

      <p className="metric-card__change">
        {change && (
          <>
            <span className={`tone-${tone}`} dir="ltr">
              {change}
            </span>{' '}
          </>
        )}
        {caption}
      </p>
    </article>
  );
}

export default function Readout({ metrics, comparison, isLoading, sourceNote }) {
  const { strings } = useSettings();
  const ready = comparison && !isLoading;

  const landCoverYear = comparison?.target.landCoverYear;
  const usesLandCover = metrics.some((metric) => LAND_COVER_VALUES.includes(metric.valueId));
  const landCoverDiffers = usesLandCover && landCoverYear && landCoverYear !== comparison.target.year;

  // The satellite's overpass time affects surface temperature by itself, so
  // warn when the two years differ by 30 minutes or more.
  const usesTemperature = metrics.some((metric) => metric.temperature);
  const fromHour = comparison?.baseline.values.overpassHour;
  const toHour = comparison?.target.values.overpassHour;
  const overpassDrift = usesTemperature && fromHour != null && toHour != null && Math.abs(toHour - fromHour) >= 0.5;

  return (
    <section className="delta-readout" aria-labelledby="delta-readout-title" aria-busy={isLoading}>
      <header className="delta-readout__header">
        <h2 id="delta-readout-title" className="delta-readout__title">
          <Icon name="chart" size={20} className="tone-layer" />
          {strings.deltaReadout}
        </h2>
      </header>

      {isLoading && (
        <p className="delta-readout__loading" role="status">
          {strings.loadingData}
        </p>
      )}

      {ready && (
        <div className="delta-readout__grid">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} baseline={comparison.baseline} target={comparison.target} />
          ))}
        </div>
      )}

      {ready && overpassDrift && (
        <p className="delta-readout__warning">
          {fillTemplate(strings.overpassNote, {
            fromYear: comparison.baseline.year,
            toYear: comparison.target.year,
            from: formatHour(fromHour),
            to: formatHour(toHour),
          })}
        </p>
      )}

      {ready && (
        <p className="delta-readout__note">
          {sourceNote}
          {landCoverDiffers && ` · ${fillTemplate(strings.landCoverYearNote, { year: landCoverYear, target: comparison.target.year })}`}
        </p>
      )}
    </section>
  );
}
