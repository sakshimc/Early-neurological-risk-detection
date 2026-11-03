function ProgressBar({ completed, total }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="progress-card card">
      <div className="progress-header">
        <div>
          <p className="eyebrow">Assessment Progress</p>
          <h2>{completed} / {total} Tests Completed</h2>
        </div>
        <div className="progress-value">{percent}%</div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
