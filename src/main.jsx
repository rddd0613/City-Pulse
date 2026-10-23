import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { AppShell } from './components/Layout';
import ComparePage from './pages/ComparePage';
import InsightsPage from './pages/InsightsPage';
import { SettingsProvider, SettingsSheet, useSettings } from './settings';
import {
  DEFAULT_AREA_ID,
  DEFAULT_BASELINE_YEAR,
  DEFAULT_ROUTE,
  DEFAULT_TARGET_YEAR,
  NAV_ITEMS,
  resolveTargetYear,
} from './data';

const ROUTES = NAV_ITEMS.filter((item) => item.ready).map((item) => item.id);

function readRoute() {
  const route = window.location.hash.replace('#/', '').replace('#', '');
  if (ROUTES.includes(route)) {
    return route;
  }
  return DEFAULT_ROUTE;
}

function useHashRoute() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    function onChange() {
      setRoute(readRoute());
    }
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
  const { isSheetOpen } = useSettings();

  const [areaId, setAreaId] = useState(DEFAULT_AREA_ID);
  const [baselineYear, setBaselineYearState] = useState(DEFAULT_BASELINE_YEAR);
  const [targetYear, setTargetYear] = useState(DEFAULT_TARGET_YEAR);

  const setBaselineYear = useCallback((year) => {
    setBaselineYearState(year);
    setTargetYear((current) => resolveTargetYear(year, current));
  }, []);

  const selection = {
    areaId,
    baselineYear,
    targetYear,
    setAreaId,
    setBaselineYear,
    setTargetYear,
  };

  let page = <ComparePage selection={selection} />;
  if (route === 'insights') {
    page = <InsightsPage selection={selection} />;
  }

  return (
    <AppShell navItems={NAV_ITEMS} activeRoute={route} onNavigate={navigate}>
      {page}
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
