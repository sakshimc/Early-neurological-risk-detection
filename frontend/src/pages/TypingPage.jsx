import { useState, useRef, useEffect } from 'react';
import { useAssessment } from '../context/AssessmentContext.jsx';

const TARGET_TEXT = 'The quick brown fox jumps over the lazy dog.';

function TypingPage() {
  const { completeAssessment } = useAssessment();
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [inputText, setInputText] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [events, setEvents] = useState([]);
  const [errorCount, setErrorCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const [typingStart, setTypingStart] = useState(null);
  const [lastKeyTime, setLastKeyTime] = useState(null);
  const inputRef = useRef(null);

  const startTest = () => {
    setStarted(true);
    setCompleted(false);
    setInputText('');
    setElapsedMs(0);
    setEvents([]);
    setErrorCount(0);
    setPaused(false);
    setPauseCount(0);
    setTypingStart(Date.now());
    setLastKeyTime(Date.now());
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (!started || completed) return;

    const currentTime = Date.now();
    const newEvents = [
      ...events,
      {
        key: event.key,
        event: 'keydown',
        timestamp: currentTime,
      },
    ];

    if (lastKeyTime && currentTime - lastKeyTime > 1200) {
      setPauseCount((count) => count + 1);
      setPaused(true);
    } else {
      setPaused(false);
    }

    setLastKeyTime(currentTime);
    setEvents(newEvents);
  };

  const handleKeyUp = (event) => {
    if (!started || completed) return;

    const currentTime = Date.now();
    setEvents((prev) => [
      ...prev,
      {
        key: event.key,
        event: 'keyup',
        timestamp: currentTime,
      },
    ]);

    const typedValue = inputRef.current?.value ?? '';
    setInputText(typedValue);
    setElapsedMs(currentTime - typingStart);

    if (typedValue.length > TARGET_TEXT.length) {
      setErrorCount((count) => count + 1);
    } else if (typedValue[typedValue.length - 1] !== TARGET_TEXT[typedValue.length - 1]) {
      setErrorCount((count) => count + 1);
    }

    if (typedValue === TARGET_TEXT) {
      setCompleted(true);
      setStarted(false);
    }
  };

  useEffect(() => {
    if (completed) {
      completeAssessment('typing');
    }
  }, [completed, completeAssessment]);

  const computeSummary = () => {
    const seconds = elapsedMs / 1000;
    const wordCount = TARGET_TEXT.split(' ').length;
    const wpm = seconds > 0 ? (wordCount / seconds) * 60 : 0;
    const correctChars = Array.from(inputText).filter((char, idx) => char === TARGET_TEXT[idx]).length;
    const accuracy = inputText.length > 0 ? (correctChars / inputText.length) * 100 : 0;

    return {
      wpm: Number(wpm.toFixed(1)),
      accuracy: Number(accuracy.toFixed(1)),
      errorCount,
      pauseCount,
      durationSeconds: Number(seconds.toFixed(1)),
    };
  };

  const summary = completed ? computeSummary() : null;

  return (
    <main>
      <section className="card">
        <h1>Typing Test</h1>
        <p>Capture typing rhythm and keystroke dynamics using a standardized sentence. This test is for research and screening only.</p>

        <div style={{ marginTop: '20px', display: 'grid', gap: '16px' }}>
          <div>
            <strong>Instructions:</strong>
            <ul>
              <li>Press Start and type the sentence exactly as shown below.</li>
              <li>Typing speed and rhythm will be recorded.</li>
              <li>This is not a medical diagnosis.</li>
            </ul>
          </div>

          <button onClick={startTest} style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: 700 }}>
            Start Typing Test
          </button>

          <div className="card" style={{ background: '#f3f4f6' }}>
            <p><strong>Target sentence:</strong></p>
            <p style={{ fontSize: '1.1rem' }}>{TARGET_TEXT}</p>
          </div>

          <div className="card" style={{ background: '#fff7ed' }}>
            <p><strong>Status:</strong> {completed ? 'Completed' : started ? 'In progress' : 'Not started'}</p>
            <p><strong>Elapsed time:</strong> {(elapsedMs / 1000).toFixed(1)} seconds</p>
            <p><strong>Errors detected:</strong> {errorCount}</p>
            <p><strong>Pause count:</strong> {pauseCount}</p>
          </div>

          <textarea
            ref={inputRef}
            disabled={!started || completed}
            rows="4"
            style={{ width: '100%', padding: '16px', fontSize: '1rem', borderRadius: '14px', border: '1px solid #d1d5db' }}
            placeholder="Type here when the test has started..."
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
          />

          {completed && summary && (
            <div className="card" style={{ background: '#ecfdf5' }}>
              <h2>Typing Test Results</h2>
              <p><strong>WPM:</strong> {summary.wpm}</p>
              <p><strong>Accuracy:</strong> {summary.accuracy}%</p>
              <p><strong>Errors:</strong> {summary.errorCount}</p>
              <p><strong>Pauses:</strong> {summary.pauseCount}</p>
              <p><strong>Duration:</strong> {summary.durationSeconds} seconds</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default TypingPage;
