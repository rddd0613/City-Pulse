// Controls on the Compare page: year cards and picker, layer tabs and the
// colour scale under the map.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../icons';
import { useSettings } from '../settings';
import { getBaselineOptions, getTargetOptions } from '../data';
import { colorAt, convertTemperature, paletteGradient, temperatureSymbol } from '../utils';

// ---------- Year cards ----------

const PICKERS = {
  baseline: { titleKey: 'selectBaselineEpoch', icon: 'history' },
  target: { titleKey: 'selectTargetEpoch', icon: 'satellite' },
};

function EpochCard({ label, year, sensor, icon, variant, isOpen, onOpen }) {
  return (
    <button type="button" className={`epoch-card epoch-card--${variant}`} aria-haspopup="dialog" aria-expanded={isOpen} onClick={onOpen}>
      <span className="epoch-card__top">
        <span className="label epoch-card__label">{label}</span>
        <span className="epoch-card__icons">
          <Icon name={icon} size={22} />
          <Icon name="chevronDown" size={18} />
        </span>
      </span>
      <span className="epoch-card__value">
        <span className="epoch-card__year">{year}</span>
        <span className="epoch-card__sensor">{sensor}</span>
      </span>
    </button>
  );
}

// Bottom sheet listing the years. A choice applies right away; Done, the
// backdrop or Escape closes it.
function EpochSheet({ title, icon, options, selectedYear, onSelect, onClose }) {
  const { strings } = useSettings();
  const titleId = useId();
  const sheetRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    sheetRef.current?.querySelector('[aria-checked="true"]')?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="epoch-sheet__backdrop" onClick={onClose} />
      <section ref={sheetRef} className="epoch-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="epoch-sheet__grabber" />
        <header className="epoch-sheet__header">
          <h2 id={titleId} className="epoch-sheet__title">
            <span className="status-dot" />
            {title}
          </h2>
          <button type="button" className="epoch-sheet__done" onClick={onClose}>
            {strings.done}
          </button>
        </header>

        <div className="epoch-sheet__list" role="radiogroup" aria-labelledby={titleId}>
          {options.map((option) => {
            const isActive = option.year === selectedYear;
            return (
              <button
                key={option.year}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={option.disabled}
                className={`epoch-option${isActive ? ' epoch-option--active' : ''}`}
                onClick={() => onSelect(option.year)}
              >
                <span className="epoch-option__icon">
                  <Icon name={icon} size={18} />
                </span>
                <span className="epoch-option__label">
                  {option.year} — {strings.epochNames[option.year]}
                </span>
                {isActive && <span className="epoch-option__badge">{strings.active}</span>}
                <span className="epoch-option__radio">{isActive && <Icon name="checkCircle" size={22} />}</span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function EpochSelector({ baselineYear, targetYear, baselineSensor, targetSensor, onBaselineChange, onTargetChange }) {
  const { strings } = useSettings();
  const [openPicker, setOpenPicker] = useState(null);
  const closePicker = useCallback(() => setOpenPicker(null), []);

  const sheet =
    openPicker === 'baseline'
      ? { options: getBaselineOptions(), selectedYear: baselineYear, onSelect: onBaselineChange }
      : { options: getTargetOptions(baselineYear), selectedYear: targetYear, onSelect: onTargetChange };

  return (
    <>
      <section className="epoch-selector" aria-label={`${strings.baselineEpoch} / ${strings.targetEpoch}`}>
        <EpochCard
          label={strings.baselineEpoch}
          year={baselineYear}
          sensor={baselineSensor}
          icon={PICKERS.baseline.icon}
          variant="baseline"
          isOpen={openPicker === 'baseline'}
          onOpen={() => setOpenPicker('baseline')}
        />
        <span className="epoch-selector__link" aria-hidden="true">
          <Icon name="compare" size={18} />
        </span>
        <EpochCard
          label={strings.targetEpoch}
          year={targetYear}
          sensor={targetSensor}
          icon={PICKERS.target.icon}
          variant="target"
          isOpen={openPicker === 'target'}
          onOpen={() => setOpenPicker('target')}
        />
      </section>

      {openPicker && (
        <EpochSheet
          title={strings[PICKERS[openPicker].titleKey]}
          icon={PICKERS[openPicker].icon}
          options={sheet.options}
          selectedYear={sheet.selectedYear}
          onSelect={sheet.onSelect}
          onClose={closePicker}
        />
      )}
    </>
  );
}

// ---------- Layer tabs ----------

export function LayerTabs({ layers, activeId, onChange }) {
  const { strings } = useSettings();
  const activeIndex = Math.max(0, layers.findIndex((layer) => layer.id === activeId));

  return (
    <div className="layer-tabs" role="tablist" aria-label="Map layer" style={{ '--active-index': activeIndex }}>
      {/* Highlight that slides under the active tab */}
      <span className="layer-tabs__indicator" aria-hidden="true" />
      {layers.map((layer) => {
        const isActive = layer.id === activeId;
        return (
          <button
            key={layer.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`layer-tabs__tab${isActive ? ' layer-tabs__tab--active' : ''}`}
            onClick={() => onChange(layer.id)}
          >
            {layer.icon && <Icon name={layer.icon} size={14} />}
            {strings.layers[layer.id]}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Colour scale ----------

// 0.2 → "+0.20"
function formatIndex(value) {
  if (value === 0) return '0.0';
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;
}

// Strip under the temperature and NDVI maps, drawn with the map's own colours.
export function LayerScale({ scale, palette }) {
  const { strings, settings } = useSettings();
  const unit = settings.temperatureUnit;
  const offset = (value) => ((value - scale.min) / (scale.max - scale.min)) * 100;

  const formatTemperature = (celsius) => {
    const value = Math.round(convertTemperature(celsius, unit) * 10) / 10;
    return `${Number.isInteger(value) ? value : value.toFixed(1)}${temperatureSymbol(unit)}`;
  };

  const ticks =
    scale.kind === 'temperature'
      ? scale.ticks.map((value) => ({ value, text: formatTemperature(value) }))
      : scale.ticks.map(({ value, label }) => ({
          value,
          text: (
            <>
              {formatIndex(value)} <span className="layer-scale__tick-name">{strings.scales[label]}</span>
            </>
          ),
        }));

  return (
    <section className={`layer-scale layer-scale--${scale.kind}`} aria-label={strings.scales.ariaLabel}>
      <header className="layer-scale__header">
        {scale.kind === 'temperature' ? (
          ['min', 'max'].map((end) => (
            <span key={end} className={`layer-scale__end layer-scale__end--${end}`}>
              <span className="layer-scale__dot" style={{ background: colorAt(palette, scale[end]) }} />
              {strings.scales[scale.endLabels[end]]}: <span dir="ltr">{formatTemperature(scale[end])}</span>
            </span>
          ))
        ) : (
          <>
            <span className="layer-scale__title">{strings.scales[scale.title]}</span>
            <span className="layer-scale__formula" dir="ltr">
              {scale.formula}
            </span>
          </>
        )}
      </header>

      <div dir="ltr">
        <span className="layer-scale__bar" style={{ background: paletteGradient(palette, scale.min, scale.max) }} />
        <span className="layer-scale__ticks">
          {ticks.map((tick, index) => (
            <span
              key={tick.value}
              className={`layer-scale__tick${index === ticks.length - 1 ? ' layer-scale__tick--last' : ''}`}
              style={{ left: `${offset(tick.value)}%` }}
            >
              {tick.text}
            </span>
          ))}
        </span>
      </div>
    </section>
  );
}
