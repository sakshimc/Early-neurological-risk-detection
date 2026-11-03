import { Navigate } from 'react-router-dom';
import { useAssessment } from '../context/AssessmentContext.jsx';

function ReportPage() {
  const { assessmentStatus } = useAssessment();

  if (assessmentStatus.report !== 'available' && assessmentStatus.report !== 'completed') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main>
      <section className="card">
        <h1>Final Report</h1>
        <p>Final Report — Available after all assessments are completed.</p>
      </section>
    </main>
  );
}

export default ReportPage;
