import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LandingScreen } from './screens/LandingScreen';
import { NavBar } from './components/layout/NavBar';
import { ApiKeyGuard } from './components/ApiKeyGuard';

const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen').then((module) => ({ default: module.OnboardingScreen })));
const ExploreScreen = lazy(() => import('./screens/ExploreScreen').then((module) => ({ default: module.ExploreScreen })));
const SavedScreen = lazy(() => import('./screens/SavedScreen').then((module) => ({ default: module.SavedScreen })));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen').then((module) => ({ default: module.HistoryScreen })));
const SessionSummaryScreen = lazy(() =>
  import('./screens/SessionSummaryScreen').then((module) => ({ default: module.SessionSummaryScreen })),
);
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((module) => ({ default: module.ProfileScreen })));

function RouteFallback() {
  return <div className="flex h-full items-center justify-center bg-zinc-950 text-white">Loading LensIQ…</div>;
}

function AppContent() {
  const location = useLocation();
  const showNavBar = ['/explore', '/saved', '/history', '/profile'].includes(location.pathname);

  return (
    <ApiKeyGuard>
      <div className="h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans antialiased selection:bg-indigo-500/30">
        <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/onboarding" element={<Suspense fallback={<RouteFallback />}><OnboardingScreen /></Suspense>} />
          <Route path="/explore" element={
            <Suspense fallback={<RouteFallback />}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="h-full"
              >
                <ExploreScreen />
              </motion.div>
            </Suspense>
          } />
          <Route path="/saved" element={
            <Suspense fallback={<RouteFallback />}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <SavedScreen />
              </motion.div>
            </Suspense>
          } />
          <Route path="/history" element={
            <Suspense fallback={<RouteFallback />}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <HistoryScreen />
              </motion.div>
            </Suspense>
          } />
          <Route path="/history/:sessionId" element={
            <Suspense fallback={<RouteFallback />}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <SessionSummaryScreen />
              </motion.div>
            </Suspense>
          } />
          <Route path="/profile" element={
            <Suspense fallback={<RouteFallback />}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <ProfileScreen />
              </motion.div>
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      {showNavBar && <NavBar />}
    </div>
    </ApiKeyGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
