function VideoInstructions({ onStart, isReady, error }) {
  return (
    <section className="card video-instructions-card">
      <h1>Video Behavioral Assessment</h1>
      <p>
        This is a behavioral research screening workflow. It is not a medical diagnosis. Please move naturally and stop if you feel uncomfortable or unsafe.
      </p>

      <div className="video-instructions-list">
        <h2>Assessment steps</h2>
        <ol>
          <li>Face observation</li>
          <li>Hand and finger movement</li>
          <li>Standing posture</li>
          <li>Walking</li>
          <li>Turning</li>
        </ol>
      </div>

      <div className="privacy-note">
        <strong>Privacy:</strong> Video is captured only for this assessment and should not contain other people. Audio is not collected.
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="action-button primary" type="button" onClick={onStart} disabled={!isReady}>
        {isReady ? 'Begin Assessment' : 'Preparing camera...'}
      </button>
    </section>
  );
}

export default VideoInstructions;
