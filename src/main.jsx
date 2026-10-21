import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { AppShell, UpcomingPage } from './components/Layout';
import ComparePage from './pages/ComparePage';
import { SettingsProvider, SettingsSheet, useSettings } from './settings';
import {
  DEFAULT_AREA_ID,
  DEFAULT_BASELINE_YEAR,
  DEFAULT_ROUTE,
  DEFAULT_TARGET_YEAR,
  NAV_ITEMS,
  resolveTargetYear,
} from './data';

const ROUTES = NAV_ITEMS.map((item) => item.id);

function readRoute() {
  const route = window.location.hash.replace(/^#\/?/, '');
  return ROUTES.includes(route) ? route : DEFAULT_ROUTE;
}

// Simple hash routing (#/compare) so pages can be linked without a router library.
function useHashRoute() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next) => {
    window.location.hash = `/${next}`;
  }, []);

  return [route, navigate];
}

function App() {
  const [route, navigate] = useHashRoute();
  const { strings, isSheetOpen } = useSettings();

  // Kept here so the area and years survive switching tabs. Explore (built
  // separately) will set the area with setAreaId.
  const [areaId, setAreaId] = useState(DEFAULT_AREA_ID);
  const [baselineYear, setBaselineYearState] = useState(DEFAULT_BASELINE_YEAR);
  const [targetYear, setTargetYear] = useState(DEFAULT_TARGET_YEAR);

  const setBaselineYear = useCallback((year) => {
    setBaselineYearState(year);
    setTargetYear((current) => resolveTargetYear(year, current));
  }, []);

  const selection = { areaId, baselineYear, targetYear, setAreaId, setBaselineYear, setTargetYear };

  return (
    <AppShell navItems={NAV_ITEMS} activeRoute={route} onNavigate={navigate}>
      {route === 'compare' ? <ComparePage selection={selection} /> : <UpcomingPage title={strings.nav[route]} />}
      {isSheetOpen && <SettingsSheet />}
    </AppShell>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
