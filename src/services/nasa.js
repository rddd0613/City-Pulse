/*
 * Readout values from NASA MODIS science products: real measured values, not
 * map colours. They come from NASA's ORNL DAAC web service
 * (https://modis.ornl.gov/data/modis_webservice.html), which needs no login.
 *
 *   lstDay         mean daytime surface temperature, July–August (°C)
 *   overpassHour   mean local solar time of those observations (h)
 *   diurnalRange   mean day − night surface temperature (°C)
 *   heatIsland     urban minus non-urban daytime temperature (°C)
 *   ndvi           mean NDVI, February–April
 *   greenCoverKm2  area with NDVI ≥ 0.15
 *   bareLandKm2    area with NDVI < 0.1
 *   urbanPercent   share of the area classed urban in MCD12Q1
 */
import { getArea } from '../data';

const API = 'https://modis.ornl.gov/rst/api/v1';

// Scale factors and valid ranges from the product user guides (Collection 6.1).
const PRODUCTS = {
  // Aqua, not Terra: Terra's overpass moved from 10:48 to 09:33 between 2010
  // and 2025 and its July–August temperatures fell ~5 °C with it.
  lstDay: { product: 'MYD11A2', band: 'LST_Day_1km', scale: 0.02, validMin: 7500, validMax: 65535, offset: -273.15 },
  lstNight: { product: 'MYD11A2', band: 'LST_Night_1km', scale: 0.02, validMin: 7500, validMax: 65535, offset: -273.15 },
  viewTime: { product: 'MYD11A2', band: 'Day_view_time', scale: 0.1, validMin: 0, validMax: 240, offset: 0 },
  ndvi: { product: 'MOD13Q1', band: '250m_16_days_NDVI', scale: 0.0001, validMin: -2000, validMax: 10000, offset: 0 },
  landCover: { product: 'MCD12Q1', band: 'LC_Type1' },
};

const LAND_COVER_LAST_YEAR = 2024;
const URBAN = 13;
const WATER = 17;

// Days of the year that are averaged: summer for heat, spring for plants
// (when Riyadh is greenest after the rains).
const SEASONS = { lst: [182, 243], ndvi: [32, 120] };

// One 50 × 50 km window around Riyadh is fetched per year; each area is a box
// inside it, and the rest of the window is the rural reference for the heat island.
const WINDOW = { latitude: 24.715, longitude: 46.73, km: 25 };

const GREEN_NDVI = 0.15; // 0.2 missed most small parks at 250 m
const BARE_NDVI = 0.1;

// ---------- Fetching ----------

const cache = new Map();

// "A2025182" = year + day of year, the date format the service uses.
const modisDate = (year, day) => `A${year}${String(day).padStart(3, '0')}`;

function cached(key, load) {
  if (!cache.has(key)) {
    const request = load();
    request.catch(() => cache.delete(key)); // failed requests are retried next time
    cache.set(key, request);
  }
  return cache.get(key);
}

// One band for every composite between two dates, over the window.
function fetchBand(key, startDate, endDate) {
  const { product, band } = PRODUCTS[key];
  const query = new URLSearchParams({
    latitude: WINDOW.latitude,
    longitude: WINDOW.longitude,
    band,
    startDate,
    endDate,
    kmAboveBelow: WINDOW.km,
    kmLeftRight: WINDOW.km,
  });
  const url = `${API}/${product}/subset?${query}`;

  return cached(url, async () => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`ORNL DAAC ${product}: HTTP ${response.status}`);
    const json = await response.json();
    if (!json.subset?.length) throw new Error(`ORNL DAAC ${product}: no data for ${startDate}`);
    return {
      grid: {
        xll: Number(json.xllcorner),
        yll: Number(json.yllcorner),
        cellSize: Number(json.cellsize),
        rows: Number(json.nrows),
        cols: Number(json.ncols),
      },
      composites: json.subset.map((item) => item.data),
    };
  });
}

// ---------- MODIS grid ----------
// MODIS pixels sit on a sinusoidal grid; these turn cells into lat/lng and back.

const EARTH_RADIUS = 6371007.181;
const DEG = Math.PI / 180;

function toLatLng(x, y) {
  const lat = y / EARTH_RADIUS / DEG;
  return { lat, lng: x / (EARTH_RADIUS * Math.cos(lat * DEG)) / DEG };
}

function cellCenter(grid, row, col) {
  return { x: grid.xll + (col + 0.5) * grid.cellSize, y: grid.yll + (grid.rows - row - 0.5) * grid.cellSize };
}

function cellIndexAt(grid, x, y) {
  const col = Math.floor((x - grid.xll) / grid.cellSize);
  const row = grid.rows - 1 - Math.floor((y - grid.yll) / grid.cellSize);
  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) return -1;
  return row * grid.cols + col;
}

// Cells whose centre is inside a ±halfKm box around [lat, lng].
function cellsInBox(grid, [lat, lng], halfKm) {
  const latSpan = (halfKm * 1000) / EARTH_RADIUS / DEG;
  const lngSpan = (halfKm * 1000) / (EARTH_RADIUS * Math.cos(lat * DEG)) / DEG;
  const cells = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const { x, y } = cellCenter(grid, row, col);
      const point = toLatLng(x, y);
      if (Math.abs(point.lat - lat) <= latSpan && Math.abs(point.lng - lng) <= lngSpan) {
        cells.push(row * grid.cols + col);
      }
    }
  }
  return cells;
}

// ---------- Values ----------

// Mean of each pixel over the season's composites, in real units (NaN if none valid).
function seasonalMean(subset, key) {
  const { scale, validMin, validMax, offset } = PRODUCTS[key];
  const size = subset.grid.rows * subset.grid.cols;
  const means = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    let sum = 0;
    let count = 0;
    for (const values of subset.composites) {
      if (values[i] >= validMin && values[i] <= validMax) {
        sum += values[i];
        count += 1;
      }
    }
    means[i] = count ? (sum / count) * scale + offset : NaN;
  }
  return means;
}

function mean(values) {
  const valid = values.filter((value) => !Number.isNaN(value));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

// Everything for one year over the whole window (shared by all areas).
function loadYear(year) {
  return cached(`year-${year}`, async () => {
    const [lstFrom, lstTo] = SEASONS.lst.map((day) => modisDate(year, day));
    const [ndviFrom, ndviTo] = SEASONS.ndvi.map((day) => modisDate(year, day));
    const landCoverYear = Math.min(year, LAND_COVER_LAST_YEAR);

    const [lstDay, lstNight, viewTime, ndvi, landCover] = await Promise.all([
      fetchBand('lstDay', lstFrom, lstTo),
      fetchBand('lstNight', lstFrom, lstTo),
      fetchBand('viewTime', lstFrom, lstTo),
      fetchBand('ndvi', ndviFrom, ndviTo),
      fetchBand('landCover', modisDate(landCoverYear, 1), modisDate(landCoverYear, 1)),
    ]);
    return {
      lstGrid: lstDay.grid,
      lstDay: seasonalMean(lstDay, 'lstDay'),
      lstNight: seasonalMean(lstNight, 'lstNight'),
      viewTime: seasonalMean(viewTime, 'viewTime'),
      ndviGrid: ndvi.grid,
      ndvi: seasonalMean(ndvi, 'ndvi'),
      landCoverGrid: landCover.grid,
      landCover: landCover.composites[0],
      landCoverYear,
    };
  });
}

function computeValues(data, area) {
  const { center } = area.view;
  const { halfKm } = area.analysis;

  // Temperature (1 km pixels), with the land-cover class under each pixel.
  const lstCells = cellsInBox(data.lstGrid, center, halfKm);
  const lstClass = Array.from({ length: data.lstDay.length }, (_, i) => {
    const { x, y } = cellCenter(data.lstGrid, Math.floor(i / data.lstGrid.cols), i % data.lstGrid.cols);
    const index = cellIndexAt(data.landCoverGrid, x, y);
    return index < 0 ? null : data.landCover[index];
  });
  const lstDay = mean(lstCells.map((i) => data.lstDay[i]));
  const overpassHour = mean(lstCells.map((i) => data.viewTime[i]));
  const diurnalRange = mean(lstCells.map((i) => data.lstDay[i] - data.lstNight[i]));

  const urbanDay = mean(lstCells.filter((i) => lstClass[i] === URBAN).map((i) => data.lstDay[i]));
  const ruralDay = mean(
    Array.from(data.lstDay.keys())
      .filter((i) => lstClass[i] !== null && lstClass[i] !== URBAN && lstClass[i] !== WATER)
      .map((i) => data.lstDay[i]),
  );
  const heatIsland = urbanDay !== null && ruralDay !== null ? urbanDay - ruralDay : null;

  // Vegetation (250 m pixels). The grid is equal-area, so every cell has the same size.
  const ndviCells = cellsInBox(data.ndviGrid, center, halfKm).filter((i) => !Number.isNaN(data.ndvi[i]));
  const cellKm2 = (data.ndviGrid.cellSize / 1000) ** 2;
  const ndvi = mean(ndviCells.map((i) => data.ndvi[i]));
  const greenCoverKm2 = ndviCells.filter((i) => data.ndvi[i] >= GREEN_NDVI).length * cellKm2;
  const bareLandKm2 = ndviCells.filter((i) => data.ndvi[i] < BARE_NDVI).length * cellKm2;

  // Land cover (500 m pixels)
  const lcCells = cellsInBox(data.landCoverGrid, center, halfKm);
  const urbanPercent = lcCells.length
    ? (lcCells.filter((i) => data.landCover[i] === URBAN).length / lcCells.length) * 100
    : null;

  return { lstDay, overpassHour, diurnalRange, heatIsland, ndvi, greenCoverKm2, bareLandKm2, urbanPercent };
}

async function getYear(areaId, year) {
  const data = await loadYear(year);
  return { year, values: computeValues(data, getArea(areaId)), landCoverYear: data.landCoverYear };
}

export async function fetchComparison(areaId, baselineYear, targetYear) {
  const [baseline, target] = await Promise.all([getYear(areaId, baselineYear), getYear(areaId, targetYear)]);
  return { baseline, target };
}
