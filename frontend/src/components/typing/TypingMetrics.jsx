function TypingMetrics({ typedLength, totalLength, accuracy, elapsedMs }) {
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <section className="card metrics-card">
      <div className="metric-row">
        <span>Characters</span>
        <span>{typedLength} / {totalLength}</span>
      </div>
      <div className="metric-row">
        <span>Accuracy</span>
        <span>{Math.round(accuracy)}%</span>
      </div>
      <div className="metric-row">
        <span>Time</span>
        <span>{formatTime(elapsedMs)}</span>
      </div>
    </section>
  );
}

export default TypingMetrics;
