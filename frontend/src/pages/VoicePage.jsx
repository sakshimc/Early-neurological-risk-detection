import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssessment } from '../context/AssessmentContext.jsx';
import { VOICE_TASKS } from '../config/voiceTasks.js';
import VoiceInstructions from '../components/voice/VoiceInstructions.jsx';
import VoiceCountdown from '../components/voice/VoiceCountdown.jsx';
import VoiceRecorder from '../components/voice/VoiceRecorder.jsx';
import { submitVoiceAssessment } from '../services/api.js';

function VoicePage() {
  const navigate = useNavigate();
  const { completeAssessment } = useAssessment();
  const [phase, setPhase] = useState('instructions');
  const [taskIndex, setTaskIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const task = useMemo(() => VOICE_TASKS[taskIndex], [taskIndex]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder, stream]);

  const startMicrophone = async () => {
    try {
      setError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone unsupported');
      }

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      const recorder = new MediaRecorder(audioStream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordingBlob(blob);
      };
      setMediaRecorder(recorder);
      recorder.start();
      setPhase('recording');
      setElapsed(0);
      recordingTimerRef.current = setInterval(() => {
        setElapsed((value) => value + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError('Microphone access was denied or is unavailable.');
      setPhase('instructions');
    }
  };

  const startCountdown = () => {
    setPhase('countdown');
    setCountdown(3);
    timerRef.current = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          clearInterval(timerRef.current);
          startMicrophone();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setPhase('review');
  };

  const submitCurrentRecording = async () => {
    if (!recordingBlob) {
      setError('No recording available to submit.');
      return;
    }

    try {
      setStatus('Submitting recording...');
      const formData = new FormData();
      formData.append('task_id', task.id);
      formData.append('task_title', task.title);
      formData.append('audio', recordingBlob, `${task.id}.webm`);
      const response = await submitVoiceAssessment(formData);
      if (response?.status === 'success') {
        setAnalysisResult(response);
        setStatus('Voice analysis completed.');
        if (taskIndex < VOICE_TASKS.length - 1) {
          setTaskIndex((value) => value + 1);
          setRecordingBlob(null);
          setPhase('instructions');
        } else {
          completeAssessment('voice');
          navigate('/report');
        }
      } else {
        throw new Error('Submission failed');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to submit the recording.');
    }
  };

  const renderPhase = () => {
    if (phase === 'instructions') {
      return <VoiceInstructions task={task} onStart={startCountdown} />;
    }
    if (phase === 'countdown') {
      return <VoiceCountdown value={countdown} />;
    }
    if (phase === 'recording') {
      return <VoiceRecorder task={task} elapsed={elapsed} onStop={stopRecording} />;
    }
    return (
      <div className="assessment-card card">
        <h2>Review</h2>
        <p>Your recording has been captured. Submit it to continue.</p>
        {analysisResult ? (
          <div className="typing-box" style={{ marginBottom: 12 }}>
            <h3>Behavioral / acoustic measurements</h3>
            <p><strong>Quality:</strong> {analysisResult.quality?.status || 'unknown'}</p>
            {analysisResult.features ? Object.entries(analysisResult.features).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {value ?? 'unavailable'}</p>
            )) : null}
          </div>
        ) : null}
        <button className="action-button primary" onClick={submitCurrentRecording}>Submit Recording</button>
        <button className="action-button" onClick={() => setPhase('instructions')}>Record Again</button>
      </div>
    );
  };

  return (
    <main>
      {error && <p className="error-text">{error}</p>}
      {status && <p className="privacy-note">{status}</p>}
      {renderPhase()}
    </main>
  );
}

export default VoicePage;
