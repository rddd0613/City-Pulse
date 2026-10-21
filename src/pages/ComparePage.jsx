import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../components/Layout';
import { EpochSelector, LayerScale, LayerTabs } from '../components/CompareControls';
import CompareMap from '../components/CompareMap';
import Readout from '../components/Readout';
import { AREAS, MAP_LAYERS, METRICS_BY_LAYER, PALETTES, getAnalysisBounds, getArea } from '../data';
import { fillTemplate } from '../i18n';
import { fetchComparison } from '../services/nasa';
import { getScenePair } from '../services/imagery';
import { useSettings } from '../settings';
import { formatIsoDate } from '../utils';

// Runs an async loader whenever `deps` change, ignoring results of older calls.
function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true });

  useEffect(() => {
    let isCurrent = true;
    setState((previous) => ({ ...previous, isLoading: true, error: null }));
    loader()
      .then((data) => isCurrent && setState({ data, error: null, isLoading: false }))
      .catch((error) => isCurrent && setState({ data: null, error, isLoading: false }));
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

// "14 Jan 2025", "23 Jan 2015 + 17 Feb 2015" or "Nov – Dec 2013"
function sceneDate(scene, months) {
  if (scene.period) {
    const [from, to] = scene.period.map((iso) => iso.split('-').map(Number));
    return from[0] === to[0]
      ? `${months[from[1] - 1]} – ${months[to[1] - 1]} ${to[0]}`
      : `${months[from[1] - 1]} ${from[0]} – ${months[to[1] - 1]} ${to[0]}`;
  }
  const date = formatIsoDate(scene.date, months);
  return scene.fillDate ? `${date} + ${formatIsoDate(scene.fillDate, months)}` : date;
}

// Footer of the map, e.g. "OLI 3 Dec 2013 / MSI 14 Jan 2025 · Labels © OpenStreetMap"
function sourceLabel(imagery, strings, showLabels) {
  const { baseline, target } = imagery.data ?? {};
  if (!baseline || !target) return '';
  const label = [baseline, target].map((scene) => `${scene.source.instrument} ${sceneDate(scene, strings.months)}`).join(' / ');
  return showLabels ? `${label} · ${strings.osmCredit}` : label;
}

const sensorOf = (scene) => (scene ? `${scene.source.instrument} ${scene.source.platform}` : '');

export default function ComparePage({ selection }) {
  const { areaId, baselineYear, targetYear, setBaselineYear, setTargetYear } = selection;
  const { settings, strings } = useSettings();
  const [layerId, setLayerId] = useState(MAP_LAYERS[0].id);

  const area = getArea(areaId);
  const layer = MAP_LAYERS.find((item) => item.id === layerId);
  const language = settings.language;

  const comparison = useAsync(() => fetchComparison(areaId, baselineYear, targetYear), [areaId, baselineYear, targetYear]);
  const imagery = useAsync(() => getScenePair(layer.imagery, baselineYear, targetYear), [layer.imagery, baselineYear, targetYear]);
  const platform = imagery.data?.target.source.platform;

  // Names on the map: the city and the selected area ("Al Malqa · Riyadh")
  // always; the other districts only with the labels setting on.
  const areaOverlay = useMemo(() => {
    const city = AREAS.find((item) => item.kind === 'city');
    const cityName = city.names[language];
    const districts = AREAS.filter((item) => item.kind === 'district' && (item.id === area.id || settings.showOverlayLabels)).map(
      (item) => ({
        name: item.id === area.id ? `${item.names[language]} · ${cityName}` : item.names[language],
        center: item.view.center,
        selected: item.id === area.id,
      }),
    );
    const cityLabel = {
      name: cityName,
      center: city.view.center,
      selected: area.id === city.id,
      city: true,
      // NASA's labels already show "Riyadh" when zoomed out.
      deferToReference: settings.showOverlayLabels,
    };
    return { box: getAnalysisBounds(area), labels: [cityLabel, ...districts] };
  }, [area, settings.showOverlayLabels, language]);

  const epochTag = (year) => `${year} · ${strings.epochNames[year]}`;
  // Coloured layers put the layer name on the target tag ("2025 · Thermal IR").
  const targetTag = layer.scale ? `${targetYear} · ${strings.layers[layer.id]}` : epochTag(targetYear);
  const palette = PALETTES[layer.imagery];

  return (
    <div className="compare-page" data-layer={layer.id}>
      <AppHeader statusText={platform ? fillTemplate(strings.orbit, { platform }) : ''} />

      <div className="region-heading">
        <p className="region-heading__eyebrow">
          <span className="status-dot status-dot--blink" />
          {strings.compareEyebrow}
        </p>
        <h2 className="region-heading__title">{area.names[language]}</h2>
      </div>

      <EpochSelector
        baselineYear={baselineYear}
        targetYear={targetYear}
        baselineSensor={sensorOf(imagery.data?.baseline)}
        targetSensor={sensorOf(imagery.data?.target)}
        onBaselineChange={setBaselineYear}
        onTargetChange={setTargetYear}
      />

      <CompareMap
        key={area.id}
        view={area.view}
        beforeScene={imagery.data?.baseline}
        afterScene={imagery.data?.target}
        beforeLabel={epochTag(baselineYear)}
        afterLabel={targetTag}
        sourceLabel={sourceLabel(imagery, strings, settings.showOverlayLabels)}
        notice={imagery.error ? strings.imageryError : null}
        areaOverlay={areaOverlay}
      />

      {layer.scale && palette && <LayerScale key={layer.id} scale={layer.scale} palette={palette} />}

      <LayerTabs layers={MAP_LAYERS} activeId={layerId} onChange={setLayerId} />

      {comparison.error ? (
        <p role="alert" className="page-error">
          {strings.comparisonError}
        </p>
      ) : (
        <Readout
          metrics={METRICS_BY_LAYER[layer.id]}
          comparison={comparison.data}
          isLoading={comparison.isLoading}
          sourceNote={`${strings.dataSources[layer.id]} · ${fillTemplate(strings.analysisBox, { size: area.analysis.halfKm * 2 })}`}
        />
      )}
    </div>
  );
}
