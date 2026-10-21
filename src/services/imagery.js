/*
 * Satellite imagery for the map.
 *
 * Most layers are NASA GIBS tiles (the service behind NASA Worldview).
 * NDVI is the exception: GIBS only has it at 250 m for these years, so it is
 * computed at 30 m from Landsat 8 on Microsoft's Planetary Computer.
 */
import { PALETTES, SCENES } from '../data';
import { rgbAt } from '../utils';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const PLANETARY = 'https://planetarycomputer.microsoft.com/api/data/v1';

const SOURCES = {
  // Harmonized Landsat Sentinel-2, 30 m. L30 (Landsat 8) starts in 2013,
  // S30 (Sentinel-2) in late 2015.
  hlsL30: {
    layerId: 'HLS_L30_Nadir_BRDF_Adjusted_Reflectance',
    tileMatrixSet: 'GoogleMapsCompatible_Level12',
    maxNativeZoom: 12,
    platform: 'Landsat 8',
    instrument: 'OLI',
  },
  hlsS30: {
    layerId: 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance',
    tileMatrixSet: 'GoogleMapsCompatible_Level12',
    maxNativeZoom: 12,
    platform: 'Sentinel-2',
    instrument: 'MSI',
  },
  // Daytime land surface temperature, 1 km. Aqua rather than Terra: Terra's
  // overpass time drifted over an hour earlier, which cooled its readings.
  modisAquaLst: {
    layerId: 'MODIS_Aqua_L3_Land_Surface_Temp_8Day_Day',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxNativeZoom: 7,
    // Drawn over the 30 m photo, so the map can stay zoomed in on a district.
    zoomLimit: 12,
    platform: 'Aqua',
    instrument: 'MODIS',
  },
  landsatNdvi: {
    planetary: true,
    layerId: 'landsat-ndvi',
    maxNativeZoom: 12,
    platform: 'Landsat 8',
    instrument: 'OLI',
  },
};

// Layers drawn on top of a true-colour photo of the same year.
const BASEMAPS = { landSurfaceTemperature: 'trueColor' };

// Roads, borders and place names (from OpenStreetMap), shown with the labels setting.
export const REFERENCE_OVERLAY = ['Reference_Features', 'Reference_Labels'].map((layerId) => ({
  layerId,
  tileUrl: `${GIBS}/${layerId}/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
  maxNativeZoom: 9,
}));

// ---------- GIBS ----------

function gibsTileUrl(source, date) {
  return `${GIBS}/${source.layerId}/default/${date}/${source.tileMatrixSet}/{z}/{y}/{x}.png`;
}

const availability = new Map();

// Asks GIBS whether a layer has imagery on a date. The answer looks like
// <Domain>2013-07-12/2013-07-12/P8D</Domain>.
function isAvailable(sourceKey, date) {
  const key = `${sourceKey}/${date}`;
  if (!availability.has(key)) {
    const { layerId, tileMatrixSet } = SOURCES[sourceKey];
    const request = fetch(`${GIBS}/1.0.0/${layerId}/default/${tileMatrixSet}/all/${date}--${date}.xml`)
      .then((response) => {
        if (!response.ok) throw new Error(`GIBS ${layerId}: HTTP ${response.status}`);
        return response.text();
      })
      .then((xml) => {
        const domain = new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('Domain')[0];
        return (domain?.textContent ?? '').split(',').some((range) => {
          const [start, end] = range.split('/').map((part) => part.slice(0, 10));
          return start <= date && date <= end;
        });
      });
    request.catch(() => availability.delete(key));
    availability.set(key, request);
  }
  return availability.get(key);
}

// ---------- NDVI from Landsat 8 ----------

// NDVI = (NIR − Red) / (NIR + Red) on surface reflectance. Landsat Level-2
// stores reflectance as DN × 0.0000275 − 0.2, so the offsets add up to −0.4.
const NDVI_EXPRESSION = '(nir08-red)*0.0000275/((nir08+red)*0.0000275-0.4)';

// NASA's NDVI colours as 32 steps (short enough for a tile URL).
function ndviColormap() {
  const colour = (value) => [...rgbAt(PALETTES.ndvi, value).map(Math.round), 255];
  const steps = [[[-1, 0], colour(0)]];
  for (let i = 0; i < 32; i += 1) {
    steps.push([[i / 32, (i + 1) / 32], colour((i + 0.5) / 32)]);
  }
  return JSON.stringify(steps);
}

const NDVI_QUERY = [
  'collection=landsat-c2-l2',
  'assets=red',
  'assets=nir08',
  'asset_as_band=true',
  `expression=${encodeURIComponent(NDVI_EXPRESSION)}`,
  'nodata=0',
  // Median of all clear scenes: hides stray clouds.
  'pixel_selection=median',
  `colormap=${encodeURIComponent(ndviColormap())}`,
].join('&');

const ndviMosaics = new Map();

// Registers a search for Landsat 8 scenes over Riyadh with ≤ 10% cloud in the
// period and returns the tile URL for it.
function ndviTileUrl([start, end]) {
  const key = `${start}/${end}`;
  if (!ndviMosaics.has(key)) {
    const riyadh = [[[46.35, 24.45], [47.05, 24.45], [47.05, 25.05], [46.35, 25.05], [46.35, 24.45]]];
    const search = {
      'filter-lang': 'cql2-json',
      filter: {
        op: 'and',
        args: [
          { op: '=', args: [{ property: 'collection' }, 'landsat-c2-l2'] },
          { op: '=', args: [{ property: 'platform' }, 'landsat-8'] },
          { op: 's_intersects', args: [{ property: 'geometry' }, { type: 'Polygon', coordinates: riyadh }] },
          { op: 'anyinteracts', args: [{ property: 'datetime' }, { interval: [`${start}T00:00:00Z`, `${end}T23:59:59Z`] }] },
          { op: '<=', args: [{ property: 'eo:cloud_cover' }, 10] },
        ],
      },
      sortby: [{ field: 'datetime', direction: 'desc' }],
    };
    const request = fetch(`${PLANETARY}/mosaic/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(search),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Planetary Computer: HTTP ${response.status}`);
        return response.json();
      })
      .then(({ searchid }) => `${PLANETARY}/mosaic/tiles/${searchid}/WebMercatorQuad/{z}/{x}/{y}@1x?${NDVI_QUERY}`);
    request.catch(() => ndviMosaics.delete(key));
    ndviMosaics.set(key, request);
  }
  return ndviMosaics.get(key);
}

// ---------- Scenes ----------

class MissingImageryError extends Error {}

function tileLayer(source, tileUrl) {
  return {
    layerId: source.layerId,
    tileUrl,
    maxNativeZoom: source.maxNativeZoom,
    zoomLimit: source.zoomLimit ?? source.maxNativeZoom,
  };
}

/*
 * What the map draws for one layer and year:
 *   tiles    tile layers, bottom to top
 *   basemap  true-colour scene underneath (temperature)
 *   source   satellite and instrument, for the labels
 */
async function getScene(layerKey, year) {
  const spec = SCENES[layerKey]?.[year];
  if (!spec) throw new Error(`No ${layerKey} imagery for ${year}`);
  const source = SOURCES[spec.source];
  const basemap = BASEMAPS[layerKey] ? await getScene(BASEMAPS[layerKey], year) : null;
  const scene = { layerKey, year, date: spec.date ?? null, period: spec.period, fillDate: spec.fill?.date ?? null, source, basemap };

  if (source.planetary) {
    return { ...scene, tiles: [tileLayer(source, await ndviTileUrl(spec.period))] };
  }

  const parts = spec.fill ? [spec.fill, spec] : [spec];
  try {
    const available = await Promise.all(parts.map((part) => isAvailable(part.source, part.date)));
    if (available.includes(false)) throw new MissingImageryError(`GIBS has no ${layerKey} imagery for ${year}`);
  } catch (error) {
    // If GIBS can't be reached the tiles may still load, so only a definite
    // "no imagery" stops the scene.
    if (error instanceof MissingImageryError) throw error;
  }
  return { ...scene, tiles: parts.map((part) => tileLayer(SOURCES[part.source], gibsTileUrl(SOURCES[part.source], part.date))) };
}

export async function getScenePair(layerKey, baselineYear, targetYear) {
  const [baseline, target] = await Promise.all([getScene(layerKey, baselineYear), getScene(layerKey, targetYear)]);
  return { baseline, target };
}
