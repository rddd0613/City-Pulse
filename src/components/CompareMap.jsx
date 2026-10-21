/*
 * The before/after map. Both years are drawn on one Leaflet map in separate
 * panes; the "before" pane is clipped at the divider, so the two stay lined
 * up while the user pans and zooms.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Icon } from '../icons';
import { useSettings } from '../settings';
import { REFERENCE_OVERLAY } from '../services/imagery';
import { formatCoordinates } from '../utils';

const PANES = {
  after: { name: 'afterImagery', zIndex: 200 },
  before: { name: 'beforeImagery', zIndex: 210 },
  reference: { name: 'referenceOverlay', zIndex: 300 },
  areaBox: { name: 'areaBox', zIndex: 400 },
  areaLabels: { name: 'areaLabels', zIndex: 410 },
};

const DOUBLE_TAP_STEP = 2;
const NO_LAYERS = [];

// Phones and most laptops have more than one device pixel per CSS pixel.
// Loading tiles one level deeper at half size gives them real detail.
const IS_HIGH_DENSITY = window.devicePixelRatio > 1;

// At zoom 12 one 30 m pixel fills one screen pixel. Half a level further it
// is still sharp; a full level further it gets blurry. So the map moves in
// half steps and stops half a level past the imagery's deepest level.
const ZOOM_STEP = 0.5;
const ZOOM_PAST_NATIVE = 0.5;

function getZoomLimit(scenes, areaMaxZoom) {
  const shown = scenes.filter(Boolean);
  if (!shown.length) return areaMaxZoom;
  const limits = shown.map((scene) => Math.max(...scene.tiles.map((tile) => tile.zoomLimit)));
  // True colour follows its sharper side; other layers the coarser one.
  const isTrueColor = shown.every((scene) => scene.layerKey === 'trueColor');
  const native = isTrueColor ? Math.max(...limits) : Math.min(...limits);
  return Math.min(areaMaxZoom, native + ZOOM_PAST_NATIVE);
}

// Tile layers for one side, bottom to top: the photo underneath (if any),
// then the scene's own tiles at the overlay opacity.
function sideStack(scene, overlayOpacity) {
  if (!scene) return [];
  const opacity = scene.basemap ? overlayOpacity : 1;
  const base = (scene.basemap?.tiles ?? []).map((tile) => ({ ...tile, opacity: 1 }));
  return [...base, ...scene.tiles.map((tile) => ({ ...tile, opacity }))];
}

function createLayer(map, item, pane) {
  return L.tileLayer(item.tileUrl, {
    pane,
    layerId: item.layerId,
    tileSize: IS_HIGH_DENSITY ? 128 : 256,
    zoomOffset: IS_HIGH_DENSITY ? 1 : 0,
    maxNativeZoom: IS_HIGH_DENSITY ? item.maxNativeZoom - 1 : item.maxNativeZoom,
    maxZoom: 22,
    keepBuffer: 4,
    opacity: item.opacity,
  }).addTo(map);
}

// Same layers as before → just swap URLs and opacity; otherwise rebuild.
function syncSide(map, current, stack, pane) {
  const sameLayers =
    current.length === stack.length && current.every((layer, i) => layer.options.layerId === stack[i].layerId);

  if (sameLayers) {
    current.forEach((layer, i) => {
      layer.setUrl(stack[i].tileUrl);
      layer.setOpacity(stack[i].opacity);
    });
    return current;
  }
  current.forEach((layer) => layer.remove());
  return stack.map((item) => createLayer(map, item, pane));
}

function escapeHtml(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return span.innerHTML;
}

function SplitTileMap({ view, beforeScene, afterScene, splitPosition, overlayOpacity, referenceLayers, areaOverlay, onMapReady, onViewChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ before: [], after: [], reference: [], area: [] });
  const applyClipRef = useRef(() => {});
  const zoomBeforeLimitRef = useRef(null);
  const splitRef = useRef(splitPosition);
  const callbacksRef = useRef({ onMapReady, onViewChange });

  splitRef.current = splitPosition;
  callbacksRef.current = { onMapReady, onViewChange };

  // Create the map once.
  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: view.center,
      zoom: view.zoom,
      minZoom: view.minZoom,
      maxZoom: view.maxZoom,
      zoomSnap: ZOOM_STEP,
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false, // replaced by zoomOnto below
    });

    Object.values(PANES).forEach(({ name, zIndex }) => {
      map.createPane(name).style.zIndex = zIndex;
    });

    const applyClip = () => {
      const pane = map.getPane(PANES.before.name);
      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      const bottomRight = map.containerPointToLayerPoint(size);
      const splitX = topLeft.x + (size.x * splitRef.current) / 100;
      pane.style.clip = `rect(${topLeft.y}px, ${splitX}px, ${bottomRight.y}px, ${topLeft.x}px)`;
    };

    const reportView = () => {
      const center = map.getCenter();
      callbacksRef.current.onViewChange?.({ lat: center.lat, lng: center.lng, zoom: map.getZoom() });
    };

    // Double tap: glide in onto the tapped spot; at the deepest zoom, back out.
    const zoomOnto = (event) => {
      if (map.getZoom() >= map.getMaxZoom()) {
        map.flyTo(view.center, Math.min(view.zoom, map.getMaxZoom()), { duration: 0.6 });
      } else {
        map.flyTo(event.latlng, Math.min(map.getZoom() + DOUBLE_TAP_STEP, map.getMaxZoom()), { duration: 0.6 });
      }
    };

    // Other districts' names would pile up when zoomed out; CSS hides them.
    const markZoom = () => {
      containerRef.current.dataset.zoomedOut = String(map.getZoom() < 11);
    };

    map.on('dblclick', zoomOnto);
    map.on('zoomend', markZoom);
    map.on('move zoom resize', applyClip);
    map.on('moveend', reportView);
    markZoom();
    applyClip();
    reportView();
    mapRef.current = map;
    applyClipRef.current = applyClip;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);
    callbacksRef.current.onMapReady?.(map);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      applyClipRef.current = () => {};
      layersRef.current = { before: [], after: [], reference: [], area: [] };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Imagery. A coarser layer lowers the zoom limit; the earlier zoom is
  // remembered so the map can go back when a sharper layer returns.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const limit = getZoomLimit([beforeScene, afterScene], view.maxZoom);
    if (map.getZoom() > limit) zoomBeforeLimitRef.current = map.getZoom();
    map.setMaxZoom(limit);
    if (zoomBeforeLimitRef.current && limit > map.getZoom()) {
      map.setZoom(Math.min(zoomBeforeLimitRef.current, limit), { animate: false });
      if (limit >= zoomBeforeLimitRef.current) zoomBeforeLimitRef.current = null;
    }

    const layers = layersRef.current;
    layers.before = syncSide(map, layers.before, sideStack(beforeScene, overlayOpacity), PANES.before.name);
    layers.after = syncSide(map, layers.after, sideStack(afterScene, overlayOpacity), PANES.after.name);
  }, [beforeScene, afterScene, overlayOpacity, view.maxZoom]);

  // Roads and place names above both sides. They're drawn at 1 km detail, so
  // they hide past one level of enlargement where they'd look blurry.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.reference.forEach((layer) => layer.remove());
    layersRef.current.reference = referenceLayers.map((reference) =>
      L.tileLayer(reference.tileUrl, {
        pane: PANES.reference.name,
        maxNativeZoom: reference.maxNativeZoom,
        maxZoom: reference.maxNativeZoom + 1,
      }).addTo(map),
    );
  }, [referenceLayers]);

  // The selected area's box and the district names.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.area.forEach((layer) => layer.remove());
    if (!areaOverlay) {
      layersRef.current.area = [];
      return;
    }
    const box = L.rectangle(areaOverlay.box, { pane: PANES.areaBox.name, className: 'area-box', interactive: false });
    const labels = areaOverlay.labels.map((label) =>
      L.marker(label.center, {
        pane: PANES.areaLabels.name,
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: [
            'area-label',
            label.selected && 'area-label--selected',
            label.city && 'area-label--city',
            label.deferToReference && 'area-label--defer',
          ]
            .filter(Boolean)
            .join(' '),
          html: `<span>${escapeHtml(label.name)}</span>`,
          iconSize: null,
        }),
      }),
    );
    layersRef.current.area = [box, ...labels].map((layer) => layer.addTo(map));
  }, [areaOverlay]);

  useEffect(() => {
    applyClipRef.current();
  }, [splitPosition]);

  return <div ref={containerRef} className="split-tile-map" />;
}

// Dragging (or arrow keys on) the divider moves the split; the rest of the
// map keeps panning normally.
function useSplitDrag(containerRef, setPosition) {
  const isDragging = useRef(false);
  const clamp = (value) => Math.min(100, Math.max(0, value));

  const moveTo = useCallback(
    (event) => {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition(clamp(((event.clientX - rect.left) / rect.width) * 100));
    },
    [containerRef, setPosition],
  );

  const onPointerUp = (event) => {
    isDragging.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return {
    onPointerDown: (event) => {
      event.preventDefault();
      event.stopPropagation();
      isDragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      moveTo(event);
    },
    onPointerMove: (event) => {
      if (isDragging.current) moveTo(event);
    },
    onPointerUp,
    onPointerCancel: onPointerUp,
    onKeyDown: (event) => {
      if (event.key === 'ArrowLeft') setPosition((current) => clamp(current - 2));
      else if (event.key === 'ArrowRight') setPosition((current) => clamp(current + 2));
      else return;
      event.preventDefault();
    },
  };
}

// The map card with its year tags, divider handle and footer. It stays
// left-to-right in Arabic too, because "before" is always the left side.
export default function CompareMap({ view, beforeScene, afterScene, beforeLabel, afterLabel, sourceLabel, notice, areaOverlay }) {
  const figureRef = useRef(null);
  const mapRef = useRef(null);
  const { settings, strings, direction } = useSettings();
  const [position, setPosition] = useState(20);
  const [center, setCenter] = useState(null);
  const dragHandlers = useSplitDrag(figureRef, setPosition);

  return (
    <figure ref={figureRef} className="compare-map" dir="ltr">
      <SplitTileMap
        view={view}
        beforeScene={beforeScene}
        afterScene={afterScene}
        splitPosition={position}
        overlayOpacity={settings.heatMapOpacity / 100}
        referenceLayers={settings.showOverlayLabels ? REFERENCE_OVERLAY : NO_LAYERS}
        areaOverlay={areaOverlay}
        onMapReady={(map) => {
          mapRef.current = map;
        }}
        onViewChange={setCenter}
      />

      {notice ? (
        <div className="compare-map__notice" role="status">
          {notice}
        </div>
      ) : (
        <div className="compare-map__divider" style={{ left: `${position}%` }} {...dragHandlers}>
          <span
            className="compare-map__handle"
            role="slider"
            tabIndex={0}
            aria-label={strings.dividerLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
          >
            <Icon name="split" size={16} />
          </span>
        </div>
      )}

      <span className="compare-map__tag compare-map__tag--before" dir={direction}>
        <span className="compare-map__bar" />
        {beforeLabel}
      </span>
      <span className="compare-map__tag compare-map__tag--after" dir={direction}>
        <span className="status-dot" />
        {afterLabel}
      </span>

      <figcaption className="compare-map__footer">
        <span className="compare-map__footer-row">
          <button type="button" className="compare-map__recenter" onClick={() => mapRef.current?.setView(view.center, view.zoom)}>
            <Icon name="focus" size={16} />
            {strings.nadirLock}
          </button>
          {settings.showOverlayLabels && center && (
            <span className="compare-map__coords" dir="ltr">
              {formatCoordinates(center, strings)}
            </span>
          )}
          <span className="compare-map__source" dir={direction}>
            {sourceLabel}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
