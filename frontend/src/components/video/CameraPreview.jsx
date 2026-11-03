import { useEffect, useRef } from 'react';

function CameraPreview({ stream, status, error }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="video-preview-card">
      {stream ? (
        <video ref={videoRef} className="video-preview" autoPlay playsInline muted />
      ) : (
        <div className="video-placeholder">
          <p>{error || status}</p>
        </div>
      )}
    </div>
  );
}

export default CameraPreview;
