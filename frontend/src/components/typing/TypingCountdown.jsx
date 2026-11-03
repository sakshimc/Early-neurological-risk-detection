import { useEffect, useState } from 'react';

function TypingCountdown({ onComplete }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count < 0) {
      onComplete();
      return;
    }

    const timer = window.setTimeout(() => {
      setCount((current) => current - 1);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <section className="card">
      <h1>Typing Assessment</h1>
      <p className="countdown-text">{count > 0 ? count : 'Start'}</p>
    </section>
  );
}

export default TypingCountdown;
