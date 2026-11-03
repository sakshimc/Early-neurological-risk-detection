function VoiceCountdown({ value }) {
  return (
    <div className="assessment-card center">
      <h2>Getting ready…</h2>
      <div className="typing-box" style={{ fontSize: '2rem', fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

export default VoiceCountdown;
