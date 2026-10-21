# City Pulse

A mobile web app for the NASA Space Apps Challenge that shows how Riyadh and its districts changed between 2013, 2015, 2020 and 2025: surface heat, vegetation (NDVI) and urban growth, from NASA satellite data.

Built with React, Vite and Leaflet.

## Run

Needs Node.js 18.18 or newer.

```bash
npm install
npm run dev        # opens http://localhost:5173
npm run dev:phone  # same, reachable from a phone on the same Wi-Fi
npm run build
```

### بالعربي

1. ثبّتي **Node.js** (نسخة LTS) من nodejs.org.
2. افتحي مجلد `city-pulse` في VS Code (**File → Open Folder**).
3. من **Terminal → New Terminal** اكتبي `npm install` (مرة وحدة) وبعدها `npm run dev`.

لتجربته على الجوال: خلي الجوال والكمبيوتر على نفس الواي فاي، شغّلي `npm run dev:phone` وافتحي رابط **Network** اللي يطلع في Safari.

## Files

```
src/
  main.jsx                 app entry, routing, selected area and years
  data.js                  areas, years, map layers, image dates, readout cards
  i18n.js                  English and Arabic text
  settings.jsx             settings (saved in the browser) and the settings sheet
  icons.jsx                SVG icons
  utils.js                 number, unit and colour helpers
  styles.css               all styles
  pages/ComparePage.jsx    the Compare screen
  components/
    Layout.jsx             header, bottom navigation, placeholder page
    CompareControls.jsx    year cards and picker, layer tabs, colour scale
    CompareMap.jsx         before/after map (Leaflet)
    Readout.jsx            readout cards
  services/
    imagery.js             satellite imagery for the map
    nasa.js                readout values from NASA MODIS
```

## Data

**Map imagery**

| Layer | Source | Resolution |
|---|---|---|
| True colour | NASA GIBS, HLS Landsat 8 (2013, 2015) and Sentinel-2 (2020, 2025), clear winter days | 30 m |
| Temperature | NASA GIBS, MODIS Aqua land surface temperature, 8 days from 12 July | 1 km |
| NDVI | Landsat 8 (NASA/USGS) via Microsoft Planetary Computer, median of clear scenes Nov–Dec | 30 m |

- NASA GIBS has no 30 m imagery of Riyadh before 2013, so 2013 is the first year.
- GIBS only has NDVI at 250 m for these years, so NDVI is computed at 30 m from Landsat 8: `(NIR − Red) / (NIR + Red)`, with NASA's NDVI colours. It is the only map layer that doesn't come from GIBS.
- The map stops zooming at 12.5, before the 30 m imagery gets blurry.

**Readout values** come from NASA MODIS products through the ORNL DAAC web service (no login needed):

| Value | Product |
|---|---|
| Surface temperature, night cooling, heat island | MYD11A2 (Aqua), July–August mean |
| NDVI, green cover (NDVI ≥ 0.15), bare ground (NDVI < 0.1) | MOD13Q1, February–April mean |
| Built-up area, urban mask | MCD12Q1 land cover (ends in 2024) |

Values are averaged over a 4 × 4 km box for districts and 40 × 40 km for Riyadh. Temperature uses Aqua because Terra's overpass time drifted more than an hour, which made its later readings cooler; the app warns when the two years' overpass times differ by 30 minutes or more.
