import { useEffect, useRef } from 'react';

function TypingArea({ value, onChange, onKeyDown, onKeyUp, disabled }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  return (
    <section className="card">
      <p><strong>Type the following sentence:</strong></p>
      <div className="target-text">The quick brown fox jumps over the lazy dog.</div>
      <textarea
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPaste={(event) => event.preventDefault()}
        onDrop={(event) => event.preventDefault()}
        disabled={disabled}
        rows="4"
        className="typing-input"
        placeholder="Start typing here..."
        autoComplete="off"
        spellCheck="false"
      />
      <p className="privacy-note">
        Keyboard timing is recorded only during this assessment. Do not enter passwords or personal information.
      </p>
    </section>
  );
}

export default TypingArea;
