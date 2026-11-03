import { Link } from 'react-router-dom';

function DashboardPage() {
  return (
    <main>
      <section className="card">
        <h1>AI Behavioral Framework for Early Neurological Risk Screening</h1>
        <p>
          This research-oriented application guides users through a sequential behavioral screening assessment. It is not a medical diagnosis tool.
        </p>
        <div style={{ marginTop: '24px' }}>
          <h2>Assessment sequence</h2>
          <ol>
            <li>Typing Test</li>
            <li>Video Behavioral Assessment (locked)</li>
            <li>Voice Assessment (locked)</li>
            <li>Cognitive Games (locked)</li>
          </ol>
          <p>
            Complete the Typing Test first to unlock the next module.
          </p>
          <Link to="/typing">
            <button style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700 }}>
              Start Typing Test
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
