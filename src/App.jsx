import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext.jsx';
import MainLayout from './components/Layout/MainLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SpatialDistribution from './pages/SpatialDistribution.jsx';
import TemporalAnalysis from './pages/TemporalAnalysis.jsx';
import ModelComparison from './pages/ModelComparison.jsx';
import DataArchive from './pages/DataArchive.jsx';

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="spatial" element={<SpatialDistribution />} />
          <Route path="temporal" element={<TemporalAnalysis />} />
          <Route path="comparison" element={<ModelComparison />} />
          <Route path="archive" element={<DataArchive />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}
