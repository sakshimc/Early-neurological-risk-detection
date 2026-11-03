function TypingResult({ summary, onSubmit, submitting, error }) {
  return (
    <section className="card result-card">
      <h1>Typing Assessment Complete</h1>
      <p>Typing data has been recorded for analysis.</p>
      <div className="metric-row">
        <span>Completion Time</span>
        <span>{summary.durationSeconds} seconds</span>
      </div>
      <div className="metric-row">
        <span>Accuracy</span>
        <span>{summary.accuracy}%</span>
      </div>
      <div className="metric-row">
        <span>Errors</span>
        <span>{summary.errorCount}</span>
      </div>
      <button
        type="button"
        className="primary action-button"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Data'}
      </button>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default TypingResult;
