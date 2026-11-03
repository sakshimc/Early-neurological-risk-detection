import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssessment } from '../context/AssessmentContext.jsx';

function shuffleArray(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function CognitiveTest() {
  const navigate = useNavigate();
  const { completeAssessment } = useAssessment();
  const [phase, setPhase] = useState('instructions');
  const [reactionTrials, setReactionTrials] = useState([]);
  const [currentReactionIndex, setCurrentReactionIndex] = useState(0);
  const [reactionStatus, setReactionStatus] = useState('Get Ready');
  const [reactionStartTime, setReactionStartTime] = useState(null);
  const [memorySequence, setMemorySequence] = useState([]);
  const [memoryInput, setMemoryInput] = useState('');
  const [memoryLevel, setMemoryLevel] = useState(3);
  const [memoryCorrectTrials, setMemoryCorrectTrials] = useState(0);
  const [memoryTotalTrials, setMemoryTotalTrials] = useState(0);
  const [memoryMaxLength, setMemoryMaxLength] = useState(3);
  const [attentionTrials, setAttentionTrials] = useState([]);
  const [attentionIndex, setAttentionIndex] = useState(0);
  const [attentionResponse, setAttentionResponse] = useState('');
  const [attentionResults, setAttentionResults] = useState({ correct_hits: 0, false_alarms: 0, missed_targets: 0, reaction_times: [] });
  const [attentionStartTime, setAttentionStartTime] = useState(null);
  const [error, setError] = useState('');
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => clearTimers(), []);

  const startReactionTrial = () => {
    clearTimers();
    setReactionStatus('Get Ready');
    const delay = 1500 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => {
      setReactionStatus('CLICK NOW');
      setReactionStartTime(performance.now());
    }, delay);
  };

  useEffect(() => {
    if (phase !== 'reaction') return undefined;
    startReactionTrial();
    return clearTimers;
  }, [phase, currentReactionIndex]);

  const handleReactionClick = () => {
    if (!reactionStartTime) return;
    const elapsed = performance.now() - reactionStartTime;
    const nextTrials = [...reactionTrials, elapsed];
    setReactionTrials(nextTrials);
    if (currentReactionIndex >= 4) {
      clearTimers();
      setPhase('memory');
      setReactionStartTime(null);
      return;
    }
    setCurrentReactionIndex((value) => value + 1);
    setReactionStartTime(null);
    startReactionTrial();
  };

  const startMemoryRound = () => {
    clearTimers();
    const digits = Array.from({ length: memoryLevel }, () => Math.floor(Math.random() * 10));
    setMemorySequence(digits);
    setMemoryInput('');
    setError('');
    timeoutRef.current = setTimeout(() => {
      setMemorySequence([]);
    }, 1000 + memoryLevel * 180);
  };

  useEffect(() => {
    if (phase !== 'memory') return undefined;
    startMemoryRound();
    return clearTimers;
  }, [phase, memoryLevel]);

  const handleMemorySubmit = (event) => {
    event.preventDefault();
    const entered = memoryInput.trim().split(/\s+/).filter(Boolean).map((value) => Number(value));
    const expected = memorySequence;
    const isCorrect = entered.length === expected.length && entered.every((value, index) => value === expected[index]);
    const nextCorrect = isCorrect ? memoryCorrectTrials + 1 : memoryCorrectTrials;
    const nextTotal = memoryTotalTrials + 1;
    const nextMaxLength = Math.max(memoryMaxLength, memoryLevel);
    setMemoryCorrectTrials(nextCorrect);
    setMemoryTotalTrials(nextTotal);
    setMemoryMaxLength(nextMaxLength);
    if (!isCorrect || memoryLevel >= 7) {
      setPhase('attention');
      setMemoryInput('');
      return;
    }
    setMemoryLevel((value) => value + 1);
    setMemoryInput('');
  };

  useEffect(() => {
    if (phase !== 'attention') return undefined;
    const shapes = [
      { label: 'Circle', color: 'blue', target: true },
      { label: 'Circle', color: 'red', target: false },
      { label: 'Square', color: 'blue', target: false },
      { label: 'Triangle', color: 'green', target: false },
    ];
    const prepared = Array.from({ length: 20 }, () => {
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      return { ...shape, id: Math.random() }; 
    });
    setAttentionTrials(prepared);
    setAttentionIndex(0);
    setAttentionResults({ correct_hits: 0, false_alarms: 0, missed_targets: 0, reaction_times: [] });
    setAttentionStartTime(performance.now());
    return clearTimers;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'attention' || attentionIndex >= attentionTrials.length) return undefined;
    const currentTrial = attentionTrials[attentionIndex];
    const nextDelay = 700 + Math.random() * 500;
    timeoutRef.current = setTimeout(() => {
      setAttentionResponse(currentTrial.label + ' ' + currentTrial.color);
      setAttentionStartTime(performance.now());
    }, nextDelay);
    return clearTimers;
  }, [phase, attentionIndex, attentionTrials]);

  const handleAttentionClick = () => {
    if (phase !== 'attention') return;
    const currentTrial = attentionTrials[attentionIndex];
    if (!currentTrial) return;
    const elapsed = performance.now() - attentionStartTime;
    const nextReactionTimes = [...attentionResults.reaction_times, elapsed];
    const nextResults = { ...attentionResults, reaction_times: nextReactionTimes };
    if (currentTrial.target) {
      nextResults.correct_hits += 1;
    } else {
      nextResults.false_alarms += 1;
    }
    setAttentionResults(nextResults);
    if (attentionIndex >= attentionTrials.length - 1) {
      const finalResults = {
        ...nextResults,
        missed_targets: attentionTrials.filter((trial) => trial.target).length - nextResults.correct_hits,
      };
      setAttentionResults(finalResults);
      setPhase('completed');
      return;
    }
    setAttentionIndex((value) => value + 1);
  };

  const handleAttentionSkip = () => {
    if (phase !== 'attention') return;
    const currentTrial = attentionTrials[attentionIndex];
    if (!currentTrial) return;
    const nextResults = { ...attentionResults };
    if (currentTrial.target) {
      nextResults.missed_targets += 1;
    }
    setAttentionResults(nextResults);
    if (attentionIndex >= attentionTrials.length - 1) {
      setPhase('completed');
      return;
    }
    setAttentionIndex((value) => value + 1);
  };

  const handleComplete = async () => {
    const result = {
      reaction_time: {
        trials: reactionTrials,
        mean_ms: reactionTrials.length ? reactionTrials.reduce((sum, value) => sum + value, 0) / reactionTrials.length : 0,
        median_ms: reactionTrials.length ? [...reactionTrials].sort((a, b) => a - b)[Math.floor(reactionTrials.length / 2)] : 0,
        variability_ms: reactionTrials.length ? Math.sqrt(reactionTrials.reduce((sum, value) => sum + (value - (reactionTrials.reduce((total, item) => total + item, 0) / reactionTrials.length)) ** 2, 0) / reactionTrials.length) : 0,
      },
      working_memory: {
        maximum_sequence_length: memoryMaxLength,
        correct_trials: memoryCorrectTrials,
        total_trials: memoryTotalTrials,
        accuracy: memoryTotalTrials ? memoryCorrectTrials / memoryTotalTrials : 0,
      },
      attention: {
        correct_hits: attentionResults.correct_hits,
        false_alarms: attentionResults.false_alarms,
        missed_targets: attentionResults.missed_targets,
        accuracy: attentionTrials.length ? (attentionResults.correct_hits + attentionResults.false_alarms) / attentionTrials.length : 0,
        mean_reaction_time_ms: attentionResults.reaction_times.length ? attentionResults.reaction_times.reduce((sum, value) => sum + value, 0) / attentionResults.reaction_times.length : 0,
      },
    };

    const response = await fetch('/api/cognitive/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: crypto.randomUUID(),
        test_id: 'cognitive',
        reaction_time: result.reaction_time,
        working_memory: result.working_memory,
        attention: result.attention,
      }),
    });

    if (response.ok) {
      completeAssessment('cognitive');
      navigate('/report');
    }
  };

  const renderPhase = () => {
    if (phase === 'instructions') {
      return (
        <div className="assessment-card card">
          <h2>Cognitive Assessment</h2>
          <p>Complete three short cognitive tasks: reaction time, sequence memory, and visual attention.</p>
          <p>This is a research-only behavioral task and does not diagnose any condition.</p>
          <button className="action-button primary" onClick={() => setPhase('reaction')}>Start Cognitive Assessment</button>
        </div>
      );
    }

    if (phase === 'reaction') {
      return (
        <div className="assessment-card card">
          <h2>Reaction Time</h2>
          <p>Wait for the screen to change, then click as quickly as possible.</p>
          <div className="typing-box">
            <h3>{reactionStatus}</h3>
          </div>
          <button className="action-button primary" onClick={handleReactionClick}>Click Now</button>
          <p>Trial {currentReactionIndex + 1} of 5</p>
        </div>
      );
    }

    if (phase === 'memory') {
      return (
        <div className="assessment-card card">
          <h2>Working Memory</h2>
          <p>Remember the sequence of digits and enter it below.</p>
          <div className="typing-box">
            {memorySequence.length ? <h3>{memorySequence.join(' ')}</h3> : <h3>Remember the sequence</h3>}
          </div>
          <form onSubmit={handleMemorySubmit}>
            <input className="typing-input" value={memoryInput} onChange={(event) => setMemoryInput(event.target.value)} placeholder="Enter digits separated by spaces" />
            <button className="action-button primary" type="submit" style={{ marginTop: 12 }}>Submit Sequence</button>
          </form>
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      );
    }

    if (phase === 'attention') {
      return (
        <div className="assessment-card card">
          <h2>Attention / Focus</h2>
          <p>Click only when you see a BLUE CIRCLE.</p>
          <div className="typing-box">
            <h3>{attentionResponse || 'Watch for the target'}</h3>
          </div>
          <button className="action-button primary" onClick={handleAttentionClick}>Target</button>
          <button className="action-button" onClick={handleAttentionSkip}>Skip</button>
        </div>
      );
    }

    return (
      <div className="assessment-card card">
        <h2>Cognitive Assessment Completed</h2>
        <p>Reaction Time ✓</p>
        <p>Working Memory ✓</p>
        <p>Attention ✓</p>
        <button className="action-button primary" onClick={handleComplete}>View Final Report</button>
      </div>
    );
  };

  return <main>{renderPhase()}</main>;
}

export default CognitiveTest;
