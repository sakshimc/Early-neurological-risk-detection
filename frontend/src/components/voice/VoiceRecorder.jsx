function VoiceRecorder({ task, elapsed, onStop }) {
  return (
    <div className="assessment-card">
      <h2>{task.title}</h2>
      <p>{task.instruction}</p>
      <div className="typing-box">
        <strong>Prompt:</strong> {task.prompt}
      </div>
      <p>Recording time: {elapsed}s</p>
      <button className="btn" onClick={onStop}>Stop Recording</button>
    </div>
  );
}

export default VoiceRecorder;
