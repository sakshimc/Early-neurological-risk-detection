import { Routes, Route, Navigate } from 'react-router-dom';
import { AssessmentProvider } from './context/AssessmentContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TypingTest from './pages/TypingTest.jsx';
import VideoTest from './pages/VideoTest.jsx';
import VoicePage from './pages/VoicePage.jsx';
import CognitiveTest from './pages/CognitiveTest.jsx';
import ReportPage from './pages/ReportPage.jsx';

function App() {
  return (
    <AssessmentProvider>
      <div className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/typing" element={<TypingTest />} />
          <Route path="/video" element={<VideoTest />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/cognitive" element={<CognitiveTest />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AssessmentProvider>
  );
}

export default App;
