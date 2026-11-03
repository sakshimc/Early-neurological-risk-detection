import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssessment } from '../context/AssessmentContext.jsx';
import CameraPreview from '../components/video/CameraPreview.jsx';
import VideoInstructions from '../components/video/VideoInstructions.jsx';
import VideoProgress from '../components/video/VideoProgress.jsx';
import VideoCountdown from '../components/video/VideoCountdown.jsx';
import { VIDEO_TASKS } from '../config/videoTasks.js';
import { submitVideoAnalysis } from '../services/api.js';

const initialStatus = 'idle';

function VideoTest() {
  const navigate = useNavigate();
  const { completeAssessment } = useAssessment();
  const [status, setStatus] = useState(initialStatus);
  const [phase, setPhase] = useState('instructions');
  const [error, setError] = useState('');
  const [stream, setStream] = useState(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [countdownLabel, setCountdownLabel] = useState('Starting in:');
  const [remainingSeconds, setRemainingSeconds] = useState(VIDEO_TASKS[0].duration);
  const [recordings, setRecordings] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const sessionIdRef = useRef(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `video-session-${Date.now()}`;
  });
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const recordingSessionRef = useRef('');

  const currentTask = useMemo(() => VIDEO_TASKS[currentTaskIndex], [currentTaskIndex]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopActiveStream();
    };
  }, []);

  const stopActiveStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setStream(null);
  };

  const requestCameraAccess = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('This browser does not support camera access.');
      setStatus('unsupported');
      setPhase('instructions');
      return;
    }

    try {
      setStatus('requesting');
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('ready');
      setPhase('countdown');
    } catch (cameraError) {
      let friendlyMessage = 'Camera access was not granted.';
      if (cameraError?.name === 'NotAllowedError') {
        friendlyMessage = 'Camera permission was denied. Please allow camera access to continue.';
      } else if (cameraError?.name === 'NotFoundError' || cameraError?.name === 'OverconstrainedError') {
        friendlyMessage = 'No camera is available on this device.';
      } else if (cameraError?.name === 'NotReadableError') {
        friendlyMessage = 'The camera is already in use by another app.';
      }
      setError(friendlyMessage);
      setStatus('error');
      setPhase('instructions');
    }
  };

  const startAssessment = () => {
    void requestCameraAccess();
  };

  const finishCurrentTask = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (currentTaskIndex < VIDEO_TASKS.length - 1) {
      setCurrentTaskIndex((prev) => prev + 1);
      setPhase('countdown');
      return;
    }

    completeAssessment('video');
    stopActiveStream();
    setAnalysisMessage('Analyzing video...');
    setPhase('analyzing');
  };

  const startRecordingForCurrentTask = () => {
    if (!streamRef.current) {
      setError('Camera is unavailable. Please try again.');
      setStatus('error');
      setPhase('instructions');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setError('This browser does not support video recording.');
      setStatus('error');
      setPhase('instructions');
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setError('This browser does not support video recording in a compatible format.');
      setStatus('error');
      setPhase('instructions');
      return;
    }

    chunksRef.current = [];
    const selectedTask = VIDEO_TASKS[currentTaskIndex];
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const recording = {
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        blob,
        mimeType,
      };
      setRecordings((prev) => [...prev, recording]);
    };

    recorder.start();
    setCountdownLabel('Recording:');
    setRemainingSeconds(VIDEO_TASKS[currentTaskIndex].duration);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          finishCurrentTask();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    console.log('Current task:', currentTaskIndex);
    console.log('Current task name:', VIDEO_TASKS[currentTaskIndex]?.title);
  }, [currentTaskIndex]);

  useEffect(() => {
    console.log('Phase:', phase);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'countdown') {
      return undefined;
    }

    console.log('Countdown:', 3);
    setCountdown(3);
    setCountdownLabel('Starting in:');
    setRemainingSeconds(VIDEO_TASKS[currentTaskIndex].duration);

    const countdownInterval = window.setInterval(() => {
      setCountdown((prev) => {
        const nextValue = prev - 1;
        console.log('Countdown:', nextValue);

        if (nextValue <= 0) {
          window.clearInterval(countdownInterval);
          setPhase('recording');
          return 0;
        }

        return nextValue;
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [phase, currentTaskIndex]);

  useEffect(() => {
    if (phase !== 'recording') {
      return undefined;
    }

    const sessionKey = `recording-${currentTaskIndex}`;
    if (recordingSessionRef.current === sessionKey) {
      return undefined;
    }

    recordingSessionRef.current = sessionKey;
    startRecordingForCurrentTask();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingSessionRef.current === sessionKey) {
        recordingSessionRef.current = '';
      }
    };
  }, [phase, currentTaskIndex]);

  useEffect(() => {
    if (status === 'completed') {
      setError('');
    }
  }, [status]);

  useEffect(() => {
    if (phase !== 'analyzing' || analysisStarted || recordings.length < VIDEO_TASKS.length) {
      return undefined;
    }

    const submitAnalysis = async () => {
      setAnalysisStarted(true);
      setAnalysisMessage('Analyzing video...');
      const formData = new FormData();
      formData.append('session_id', sessionIdRef.current());
      recordings.forEach((recording) => {
        formData.append('files', recording.blob, `${recording.taskId}.webm`);
      });

      try {
        const result = await submitVideoAnalysis(formData);
        setAnalysisResult(result);
        setAnalysisMessage('Video analysis completed.');
        setPhase('analysis-complete');
      } catch (analysisError) {
        setError('Video analysis could not be completed.');
        setAnalysisMessage('Video analysis failed.');
        setPhase('analysis-complete');
      }
    };

    void submitAnalysis();
    return undefined;
  }, [phase, recordings, analysisStarted]);

  const handleContinue = () => {
    navigate('/');
  };

  const getSupportedMimeType = () => {
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const renderContent = () => {
    if (phase === 'analyzing') {
      return (
        <section className="card video-complete-card">
          <h1>Analyzing video...</h1>
          <p>{analysisMessage}</p>
          <p>Objective behavioral measurements are being extracted from the recorded task videos.</p>
        </section>
      );
    }

    if (phase === 'analysis-complete') {
      return (
        <section className="card video-complete-card">
          <h1>Video analysis completed.</h1>
          <p>Video behavioral measurements successfully extracted.</p>
          {analysisResult?.tasks ? (
            <ul>
              {Object.entries(analysisResult.tasks).map(([taskKey, taskSummary]) => (
                <li key={taskKey}>{taskKey}: {taskSummary?.quality === 'ok' ? '✓' : '⚠'} {taskSummary?.quality || 'unknown'}</li>
              ))}
            </ul>
          ) : null}
          <button className="action-button primary" type="button" onClick={handleContinue}>
            Continue
          </button>
        </section>
      );
    }

    if (phase === 'completed') {
      return (
        <section className="card video-complete-card">
          <h1>Video Assessment Completed</h1>
          <p>5 / 5 tasks completed</p>
          <p>This phase captured video recordings for the assessment workflow only. No diagnosis or classification was performed.</p>
          <button className="action-button primary" type="button" onClick={handleContinue}>
            Continue
          </button>
        </section>
      );
    }

    if (phase === 'instructions') {
      return (
        <VideoInstructions
          onStart={startAssessment}
          isReady={status !== 'unsupported' && status !== 'requesting'}
          error={error}
        />
      );
    }

    return (
      <section className="card video-assessment-card">
        <VideoProgress currentStep={currentTaskIndex + 1} total={VIDEO_TASKS.length} taskTitle={currentTask.title} />
        <div className="video-task-header">
          <h2>{currentTask.title}</h2>
          <p>{currentTask.instruction}</p>
          {currentTask.safetyNote ? <p className="video-safety-note">{currentTask.safetyNote}</p> : null}
        </div>

        <CameraPreview stream={stream} status="Live camera preview" error={error} />

        {phase === 'countdown' ? (
          <VideoCountdown value={countdown} label={countdownLabel} />
        ) : (
          <VideoCountdown value={`${remainingSeconds} seconds remaining`} label={countdownLabel} />
        )}

        <div className="privacy-note">
          Video is captured only for this assessment and should not contain other people.
        </div>
      </section>
    );
  };

  return <main>{renderContent()}</main>;
}

export default VideoTest;
