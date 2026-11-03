import AssessmentCard from '../components/AssessmentCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import Header from '../components/Header.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import { useAssessment } from '../context/AssessmentContext.jsx';

function Dashboard() {
  const { assessmentStatus, completedCount } = useAssessment();

  const cards = [
    {
      title: 'Typing Assessment',
      description: 'Analyze typing speed, keystroke timing, rhythm, pauses and typing accuracy.',
      status: assessmentStatus.typing,
      route: '/typing',
    },
    {
      title: 'Video Behavioral Assessment',
      description: 'Analyze hand and finger movements, facial behavior, gait and posture.',
      status: assessmentStatus.video,
      route: '/video',
    },
    {
      title: 'Voice Assessment',
      description: 'Analyze speech characteristics such as pitch, loudness, pauses and speech timing.',
      status: assessmentStatus.voice,
      route: '/voice',
    },
    {
      title: 'Cognitive Assessment',
      description: 'Evaluate reaction time, attention and working-memory performance through short interactive tasks.',
      status: assessmentStatus.cognitive,
      route: '/cognitive',
    },
  ];

  return (
    <main>
      <Header />
      <Disclaimer />
      <ProgressBar completed={completedCount} total={4} />
      <div className="dashboard-grid">
        {cards.map((card) => (
          <AssessmentCard key={card.title} {...card} />
        ))}
      </div>
    </main>
  );
}

export default Dashboard;
