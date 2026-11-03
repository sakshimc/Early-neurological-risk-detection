export const VOICE_TASKS = [
  {
    id: 'reading',
    title: 'Reading Sentence',
    duration: 10,
    instruction: 'Please read the following sentence aloud at your natural speaking pace.',
    prompt: 'The quick brown fox jumps over the lazy dog.',
    safetyNote: '',
  },
  {
    id: 'vowel',
    title: 'Sustained Vowel',
    duration: 10,
    instruction: "Take a comfortable breath and say 'AAAA' naturally for as long as you comfortably can.",
    prompt: 'AAAA',
    safetyNote: 'You may stop at any time if you feel uncomfortable.',
  },
  {
    id: 'syllable',
    title: 'Repeated Syllable',
    duration: 10,
    instruction: "Please say 'pa-ta-ka' repeatedly at your natural speaking pace.",
    prompt: 'pa-ta-ka',
    safetyNote: '',
  },
];
