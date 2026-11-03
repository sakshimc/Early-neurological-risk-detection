import { useNavigate } from 'react-router-dom';

function AssessmentCard({ title, description, status, route, buttonLabel }) {
  const navigate = useNavigate();
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const actionLabel = buttonLabel || (isCompleted ? 'Review' : 'Start Test');

  const handleClick = () => {
    if (isLocked) return;
    navigate(route);
  };

  const statusText = isLocked ? '🔒 Locked' : isCompleted ? '✓ Completed' : '▶ Available';

  return (
    <div className={`card assessment-card ${status}`}>
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          <p className="status-label">{statusText}</p>
        </div>
      </div>
      <p>{description}</p>
      <button
        type="button"
        className={`action-button ${isLocked ? 'disabled' : 'primary'}`}
        disabled={isLocked}
        onClick={handleClick}
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default AssessmentCard;
