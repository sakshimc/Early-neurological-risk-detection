function VideoCountdown({ value, label }) {
  return (
    <div className="video-countdown-card">
      <p className="video-countdown-label">{label}</p>
      <div className="countdown-text">{value}</div>
    </div>
  );
}

export default VideoCountdown;
