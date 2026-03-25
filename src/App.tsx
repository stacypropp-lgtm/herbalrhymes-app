import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout.tsx';

const StudyPage = lazy(() => import('./pages/StudyPage.tsx'));
const QuizPage = lazy(() => import('./pages/QuizPage.tsx'));
const BrowsePage = lazy(() => import('./pages/BrowsePage.tsx'));
const ProgressPage = lazy(() => import('./pages/ProgressPage.tsx'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-forest border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<StudyPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/progress" element={<ProgressPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
