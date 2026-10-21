// App data: places, years, map layers and readout cards.
// Interface text for all of these lives in i18n.js.

export const NAV_ITEMS = [
  { id: 'explore', icon: 'globe' },
  { id: 'compare', icon: 'compare' },
  { id: 'pulse-ai', featured: true },
  { id: 'insights', icon: 'insights' },
  { id: 'data', icon: 'database' },
];

export const DEFAULT_ROUTE = 'compare';

// ---------- Years ----------

// 2013 is the first year NASA has 30 m imagery of Riyadh (HLS starts March 2013).
const EPOCHS = [2013, 2015, 2020, 2025];
export const DEFAULT_BASELINE_YEAR = 2013;
export const DEFAULT_TARGET_YEAR = 2025;

// The target year is always later than the baseline.
export function getBaselineOptions() {
  return EPOCHS.map((year, index) => ({ year, disabled: index === EPOCHS.length - 1 }));
}

export function getTargetOptions(baselineYear) {
  return EPOCHS.filter((year) => year > baselineYear).map((year) => ({ year, disabled: false }));
}

export function resolveTargetYear(baselineYear, targetYear) {
  if (targetYear > baselineYear) return targetYear;
  return EPOCHS.find((year) => year > baselineYear) ?? targetYear;
}

// ---------- Places ----------

// Zoom 12 is the sharpest level of the 30 m imagery. The map stops half a
// level past it; further in, the photo gets blurry.
const MAP_LIMITS = { minZoom: 6, maxZoom: 12.5 };

// Districts open at zoom 11 so the area around them is visible too.
const district = (center) => ({ center, zoom: 11, ...MAP_LIMITS });

// Readout values are averaged over a square box around the centre: 4 × 4 km
// for districts (their boundaries aren't published), 40 × 40 km for Riyadh.
const DISTRICT_BOX = { halfKm: 2 };

export const AREAS = [
  {
    id: 'riyadh',
    names: { en: 'Riyadh', ar: 'الرياض' },
    kind: 'city',
    // A little east of the city centre so the whole city fits the map.
    view: { center: [24.715, 46.73], zoom: 10, ...MAP_LIMITS },
    analysis: { halfKm: 20 },
  },
  {
    id: 'al-malqa',
    names: { en: 'Al Malqa & North Corridor', ar: 'الملقا والممر الشمالي' },
    kind: 'district',
    view: district([24.799, 46.5976]), // Yandex Maps
    analysis: DISTRICT_BOX,
  },
  {
    id: 'al-nafal',
    names: { en: 'Al Nafal', ar: 'النفل' },
    kind: 'district',
    view: district([24.7801, 46.6737]), // Wikipedia
    analysis: DISTRICT_BOX,
  },
  {
    id: 'al-olaya',
    names: { en: 'Al Olaya', ar: 'العليا' },
    kind: 'district',
    view: district([24.6957, 46.6811]), // Wikipedia
    analysis: DISTRICT_BOX,
  },
  {
    id: 'al-rabwah',
    names: { en: 'Al Rabwah', ar: 'الربوة' },
    kind: 'district',
    view: district([24.6928, 46.7542]), // Wikipedia
    analysis: DISTRICT_BOX,
  },
  {
    id: 'al-malaz',
    names: { en: 'Al Malaz', ar: 'الملز' },
    kind: 'district',
    view: district([24.6647, 46.7353]), // Wikipedia
    analysis: DISTRICT_BOX,
  },
];

export const DEFAULT_AREA_ID = 'al-malqa';

export function getArea(areaId) {
  return AREAS.find((area) => area.id === areaId) ?? getArea(DEFAULT_AREA_ID);
}

// South-west and north-east corners of the area's analysis box.
export function getAnalysisBounds(area) {
  const [lat, lng] = area.view.center;
  const dLat = area.analysis.halfKm / 111.32;
  const dLng = area.analysis.halfKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat - dLat, lng - dLng],
    [lat + dLat, lng + dLng],
  ];
}

// ---------- Map layers ----------

// Colour stops spread evenly between min and max.
function evenStops(colors, min, max) {
  return colors.map((color, index) => ({ value: min + ((max - min) * index) / (colors.length - 1), color }));
}

// NASA's colour maps (GIBS MODIS_Land_Surface_Temp.xml, 200–350 K, and
// MODIS_L3_NDVI.xml, 0–1), used for the map and the scale strip under it.
export const PALETTES = {
  landSurfaceTemperature: evenStops(
    ['#c900ff', '#4900ff', '#0047ff', '#00ebff', '#66ff12', '#deff00', '#ffbe00', '#ff5b00', '#ff0100'],
    200 - 273.15,
    350 - 273.15,
  ),
  ndvi: evenStops(
    ['#f1ecec', '#dfcec1', '#b4a596', '#a18064', '#96ba20', '#529800', '#2e8001', '#006401', '#001801'],
    0,
    1,
  ),
};

export const MAP_LAYERS = [
  { id: 'true-radiance', icon: null, imagery: 'trueColor', scale: null },
  {
    id: 'thermal-ir',
    icon: 'thermometer',
    imagery: 'landSurfaceTemperature',
    // The part of NASA's −73…77 °C range that Riyadh uses.
    scale: {
      kind: 'temperature',
      min: 20,
      max: 60,
      ticks: [20, 30, 40, 50, 60],
      endLabels: { min: 'cooler', max: 'hotter' },
    },
  },
  {
    id: 'ndvi',
    icon: 'sprout',
    imagery: 'ndvi',
    scale: {
      kind: 'index',
      min: -0.2,
      max: 0.6,
      ticks: [
        { value: -0.2, label: 'barren' },
        { value: 0, label: 'soil' },
        { value: 0.2, label: 'sparse' },
        { value: 0.6, label: 'denseCanopy' },
      ],
      title: 'ndviDistribution',
      formula: '(NIR − RED) / (NIR + RED)',
    },
  },
];

/*
 * Which images the map shows for each layer and year. All dates were checked
 * on NASA's servers (October 2026).
 *
 * True colour: 30 m HLS, clear winter days. Riyadh sits on the edge of two
 * Landsat paths, so 2013 and 2015 lay one day over another (`fill`) to cover
 * the whole city. Landsat 8 started in spring 2013, hence December for 2013.
 *
 * Temperature: MODIS Aqua 8-day composite from 11–12 July each year.
 *
 * NDVI: 30 m from Landsat 8, median of the clear scenes of November–December
 * (same satellite and season every year). See services/imagery.js.
 */
export const SCENES = {
  trueColor: {
    2013: { source: 'hlsL30', date: '2013-12-03', fill: { source: 'hlsL30', date: '2013-12-12' } },
    2015: { source: 'hlsL30', date: '2015-01-23', fill: { source: 'hlsL30', date: '2015-02-17' } },
    2020: { source: 'hlsS30', date: '2020-01-11' },
    2025: { source: 'hlsS30', date: '2025-01-14' },
  },
  landSurfaceTemperature: {
    2013: { source: 'modisAquaLst', date: '2013-07-12' },
    2015: { source: 'modisAquaLst', date: '2015-07-12' },
    2020: { source: 'modisAquaLst', date: '2020-07-11' },
    2025: { source: 'modisAquaLst', date: '2025-07-12' },
  },
  ndvi: {
    2013: { source: 'landsatNdvi', period: ['2013-11-01', '2013-12-31'] },
    2015: { source: 'landsatNdvi', period: ['2015-11-01', '2015-12-31'] },
    2020: { source: 'landsatNdvi', period: ['2020-11-01', '2020-12-31'] },
    2025: { source: 'landsatNdvi', period: ['2025-11-01', '2025-12-31'] },
  },
};

// ---------- Readout cards ----------

/*
 * Cards under each map layer. Values come from services/nasa.js.
 *   valueId      key of the value from the NASA data
 *   temperature  'absolute' or 'difference' (only differences skip the +32 for °F)
 *   icon         'trend' follows the direction of the change
 *   display      'change' shows the % change as the main figure
 *   change       'temperatureDelta' shows the change in degrees instead of %
 *   caption      'from' (default), 'vsYear' or a key of strings.captions
 *   increaseIsPositive  whether a rise is shown green or red
 */
export const METRICS_BY_LAYER = {
  'true-radiance': [
    { id: 'surfaceHeat', valueId: 'lstDay', temperature: 'absolute', decimals: 1, icon: 'trend', increaseIsPositive: false },
    { id: 'vegetation', valueId: 'ndvi', decimals: 2, icon: 'trend', increaseIsPositive: true },
    { id: 'urbanization', valueId: 'urbanPercent', unit: '%', decimals: 0, icon: 'building', iconTone: 'accent', increaseIsPositive: true },
  ],
  'thermal-ir': [
    { id: 'surfaceTemp', valueId: 'lstDay', temperature: 'absolute', fullUnitInCaption: true, decimals: 1, icon: 'trend', increaseIsPositive: false },
    { id: 'diurnalCooling', valueId: 'diurnalRange', temperature: 'difference', decimals: 1, icon: 'bolt', iconTone: 'negative', caption: 'coolingDelta', increaseIsPositive: true },
    {
      id: 'heatIsland',
      valueId: 'heatIsland',
      temperature: 'difference',
      signed: true,
      decimals: 1,
      change: 'temperatureDelta',
      icon: 'locationCity',
      iconTone: 'accent',
      caption: 'vsRural',
      increaseIsPositive: false,
    },
  ],
  ndvi: [
    { id: 'ndviIndex', valueId: 'ndvi', decimals: 2, signed: true, icon: 'eco', iconTone: 'layer', caption: 'vsYear', increaseIsPositive: true },
    { id: 'greenCover', valueId: 'greenCoverKm2', unit: 'km²', decimals: 1, icon: 'park', iconTone: 'layer', caption: 'netSurge', increaseIsPositive: true },
    { id: 'aridShift', valueId: 'bareLandKm2', display: 'change', icon: 'landscape', iconTone: 'accent', caption: 'bareGround', increaseIsPositive: false },
  ],
};
