function VideoProgress({ currentStep, total, taskTitle }) {
  return (
    <div className="video-progress-card">
      <div className="progress-header">
        <strong>Task progress</strong>
        <span>
          Step {currentStep} of {total}
        </span>
      </div>
      <p className="video-task-title">{taskTitle}</p>
    </div>
  );
}

export default VideoProgress;
