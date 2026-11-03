import { createContext, useContext, useMemo, useState } from 'react';

const AssessmentContext = createContext(null);

const initialAssessmentState = {
  typing: 'available',
  video: 'locked',
  voice: 'locked',
  cognitive: 'locked',
  report: 'locked',
};

export function AssessmentProvider({ children }) {
  const [assessmentStatus, setAssessmentStatus] = useState(initialAssessmentState);

  const completedCount = useMemo(
    () => Object.values(assessmentStatus).filter((status) => status === 'completed').length,
    [assessmentStatus]
  );

  const completeAssessment = (testKey) => {
    setAssessmentStatus((current) => {
      const nextStatus = { ...current };

      if (testKey === 'typing' && current.typing !== 'completed') {
        nextStatus.typing = 'completed';
        nextStatus.video = 'available';
      } else if (testKey === 'video' && current.video !== 'completed') {
        nextStatus.video = 'completed';
        nextStatus.voice = 'available';
      } else if (testKey === 'voice' && current.voice !== 'completed') {
        nextStatus.voice = 'completed';
        nextStatus.cognitive = 'available';
      } else if (testKey === 'cognitive' && current.cognitive !== 'completed') {
        nextStatus.cognitive = 'completed';
        nextStatus.report = 'available';
      }

      return nextStatus;
    });
  };

  const value = useMemo(
    () => ({ assessmentStatus, completedCount, completeAssessment }),
    [assessmentStatus, completedCount]
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error('useAssessment must be used within AssessmentProvider');
  }
  return context;
}
