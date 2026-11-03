import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import TypingInstructions from "../components/typing/TypingInstructions.jsx";
import TypingCountdown from "../components/typing/TypingCountdown.jsx";
import TypingArea from "../components/typing/TypingArea.jsx";
import TypingMetrics from "../components/typing/TypingMetrics.jsx";
import TypingResult from "../components/typing/TypingResult.jsx";

import { submitTypingData } from "../services/api.js";
import { useAssessment } from "../context/AssessmentContext.jsx";

const TARGET_TEXT =
  "The quick brown fox jumps over the lazy dog.";

function TypingTest() {
  const navigate = useNavigate();
  const { completeAssessment } = useAssessment();

  const [screen, setScreen] = useState("instructions");

  // Use browser's built-in UUID generator.
  // No uuid package is required.
  const [sessionId] = useState(() => crypto.randomUUID());

  const [typedText, setTypedText] = useState("");
  const [events, setEvents] = useState([]);

  const [startedAt, setStartedAt] = useState(null);
  const [completedAt, setCompletedAt] = useState(null);

  const [elapsedMs, setElapsedMs] = useState(0);

  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const totalChars = TARGET_TEXT.length;

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  useEffect(() => {
    let timer;

    if (screen === "typing" && startedAt && !completed) {
      timer = window.setInterval(() => {
        setElapsedMs(
          Math.max(0, performance.now() - startedAt)
        );
      }, 100);
    }

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [screen, startedAt, completed]);

  // --------------------------------------------------
  // ACCURACY
  // --------------------------------------------------

  const accuracy = useMemo(() => {
    if (!typedText.length) {
      return 100;
    }

    let matches = 0;

    Array.from(typedText).forEach((char, index) => {
      if (char === TARGET_TEXT[index]) {
        matches += 1;
      }
    });

    return (matches / typedText.length) * 100;
  }, [typedText]);

  // --------------------------------------------------
  // ERROR COUNT
  // --------------------------------------------------

  const errorCount = useMemo(() => {
    let errors = 0;

    Array.from(typedText).forEach((char, index) => {
      if (char !== TARGET_TEXT[index]) {
        errors += 1;
      }
    });

    return errors;
  }, [typedText]);

  // --------------------------------------------------
  // RAW DATA
  // --------------------------------------------------

  const rawData = useMemo(
    () => ({
      session_id: sessionId,
      test_id: "typing",
      target_text: TARGET_TEXT,
      typed_text: typedText,
      started_at: startedAt,
      completed_at: completedAt,
      events: events,
    }),
    [
      sessionId,
      typedText,
      startedAt,
      completedAt,
      events,
    ]
  );

  // --------------------------------------------------
  // START TEST
  // --------------------------------------------------

  const handleStart = () => {
    setTypedText("");
    setEvents([]);
    setStartedAt(null);
    setCompletedAt(null);
    setElapsedMs(0);
    setCompleted(false);
    setSubmitError(null);

    setScreen("countdown");
  };

  // --------------------------------------------------
  // COUNTDOWN COMPLETE
  // --------------------------------------------------

  const handleCountdownComplete = () => {
    const startTime = performance.now();

    setStartedAt(startTime);
    setElapsedMs(0);
    setScreen("typing");
  };

  // --------------------------------------------------
  // INPUT CHANGE
  // --------------------------------------------------

  const handleInputChange = (event) => {
    if (completed) {
      return;
    }

    const nextText = event.target.value;

    // Do not allow more characters than target text.
    if (nextText.length > totalChars) {
      return;
    }

    setTypedText(nextText);
  };

  // --------------------------------------------------
  // KEYBOARD EVENTS
  // --------------------------------------------------

  const handleKeyEvent = (event, eventType) => {
    if (screen !== "typing" || completed) {
      return;
    }

    if (
      eventType !== "keydown" &&
      eventType !== "keyup"
    ) {
      return;
    }

    // Ignore browser shortcuts such as Ctrl+C,
    // Ctrl+V, Alt combinations, etc.
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    const nextEvent = {
      key: event.key,
      event: eventType,
      timestamp: Math.round(performance.now()),
    };

    setEvents((currentEvents) => [
      ...currentEvents,
      nextEvent,
    ]);
  };

  // --------------------------------------------------
  // CHECK COMPLETION
  // --------------------------------------------------

  useEffect(() => {
    if (
      screen === "typing" &&
      startedAt &&
      typedText === TARGET_TEXT &&
      typedText.length === totalChars
    ) {
      const completionTime = performance.now();

      setCompleted(true);
      setCompletedAt(completionTime);

      setElapsedMs(
        Math.max(0, completionTime - startedAt)
      );
    }
  }, [
    typedText,
    screen,
    startedAt,
    totalChars,
  ]);

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const summary = useMemo(() => {
    let durationSeconds = "0.00";

    if (completed && completedAt && startedAt) {
      durationSeconds = (
        (completedAt - startedAt) /
        1000
      ).toFixed(2);
    } else {
      durationSeconds = (
        elapsedMs / 1000
      ).toFixed(2);
    }

    return {
      durationSeconds,
      accuracy: accuracy.toFixed(1),
      errorCount,
      typedTextLength: typedText.length,
    };
  }, [
    completed,
    completedAt,
    startedAt,
    elapsedMs,
    accuracy,
    errorCount,
    typedText.length,
  ]);

  // --------------------------------------------------
  // SUBMIT DATA
  // --------------------------------------------------

  const handleSubmit = async () => {
    if (!completed) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await submitTypingData(rawData);

      if (response?.status === "success") {
        // Mark typing assessment as completed.
        completeAssessment("typing");

        // Return to dashboard.
        navigate("/");
      } else {
        setSubmitError(
          "Unable to submit typing data. Please try again."
        );
      }
    } catch (error) {
      console.error(
        "Typing submission error:",
        error
      );

      setSubmitError(
        "Unable to submit typing data. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="typing-test-page">

      {/* ------------------------------------------ */}
      {/* INSTRUCTIONS */}
      {/* ------------------------------------------ */}

      {screen === "instructions" && (
        <TypingInstructions
          onStart={handleStart}
        />
      )}

      {/* ------------------------------------------ */}
      {/* COUNTDOWN */}
      {/* ------------------------------------------ */}

      {screen === "countdown" && (
        <TypingCountdown
          onComplete={handleCountdownComplete}
        />
      )}

      {/* ------------------------------------------ */}
      {/* TYPING SCREEN */}
      {/* ------------------------------------------ */}

      {screen === "typing" && !completed && (
        <div className="typing-container">

          <h1>Typing Assessment</h1>

          <p>
            Type the following sentence as naturally
            and accurately as possible.
          </p>

          <div className="target-text">
            {TARGET_TEXT}
          </div>

          <TypingMetrics
            elapsedMs={elapsedMs}
            accuracy={accuracy}
            typedCharacters={typedText.length}
            totalCharacters={totalChars}
          />

          <TypingArea
            value={typedText}
            onChange={handleInputChange}
            onKeyDown={(event) =>
              handleKeyEvent(event, "keydown")
            }
            onKeyUp={(event) =>
              handleKeyEvent(event, "keyup")
            }
            disabled={completed}
          />

          <p className="privacy-notice">
            Keyboard timing is recorded only during
            this assessment. Do not enter passwords
            or personal information.
          </p>

        </div>
      )}

      {/* ------------------------------------------ */}
      {/* RESULT */}
      {/* ------------------------------------------ */}

      {completed && (
        <div className="typing-result-container">

          <TypingResult
            summary={summary}
            onSubmit={handleSubmit}
            submitting={submitting}
          />

          {submitError && (
            <p className="submit-error">
              {submitError}
            </p>
          )}

        </div>
      )}

    </div>
  );
}

export default TypingTest;