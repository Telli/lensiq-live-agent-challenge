import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LandingScreen } from './screens/LandingScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { SavedScreen } from './screens/SavedScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { NavBar } from './components/layout/NavBar';

import { ApiKeyGuard } from './components/ApiKeyGuard';

function AppContent() {
  const location = useLocation();
  const showNavBar = ['/explore', '/saved', '/history', '/profile'].includes(location.pathname);

  return (
    <ApiKeyGuard>
      <div className="h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans antialiased selection:bg-indigo-500/30">
        <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/explore" element={
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="h-full"
            >
              <ExploreScreen />
            </motion.div>
          } />
          <Route path="/saved" element={
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <SavedScreen />
            </motion.div>
          } />
          <Route path="/history" element={
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <HistoryScreen />
            </motion.div>
          } />
          <Route path="/profile" element={
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ProfileScreen />
            </motion.div>
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
