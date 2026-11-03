function VoiceInstructions({ task, onStart }) {
  return (
    <div className="assessment-card">
      <h2>Voice Assessment</h2>
      <p>This short recording captures your voice for research-only analysis.</p>
      <div className="typing-box">
        <h3>{task.title}</h3>
        <p>{task.instruction}</p>
        {task.prompt && <blockquote>{task.prompt}</blockquote>}
        {task.safetyNote && <p className="muted">{task.safetyNote}</p>}
      </div>
      <button className="btn" onClick={onStart}>Start Recording</button>
    </div>
  );
}

export default VoiceInstructions;
