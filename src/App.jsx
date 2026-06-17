import React, { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SpatialDistribution from './pages/SpatialDistribution.jsx';
import TemporalAnalysis from './pages/TemporalAnalysis.jsx';
import ModelComparison from './pages/ModelComparison.jsx';
import DataArchive from './pages/DataArchive.jsx';
import { mockObservations, mockForecasts } from './data/mockData.js';

export default function App() {
  const [observations] = useState(mockObservations);
  const [forecasts] = useState(mockForecasts);

  const appData = useMemo(() => ({
    observations,
    forecasts
  }), [observations, forecasts]);

  return (
    <Routes>
      <Route path="/" element={<MainLayout data={appData} />}>
        <Route index element={<Dashboard data={appData} />} />
        <Route path="spatial" element={<SpatialDistribution data={appData} />} />
        <Route path="temporal" element={<TemporalAnalysis data={appData} />} />
        <Route path="comparison" element={<ModelComparison data={appData} />} />
        <Route path="archive" element={<DataArchive data={appData} />} />
      </Route>
    </Routes>
  );
}
