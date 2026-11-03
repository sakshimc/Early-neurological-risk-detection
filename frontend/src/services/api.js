import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export async function submitTypingData(payload) {
  const response = await apiClient.post('/api/typing/submit', payload);
  return response.data;
}

export async function submitVideoAnalysis(formData) {
  const response = await axios.post(`${apiUrl}/api/video/analyze`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
  return response.data;
}

export async function submitVoiceAssessment(formData) {
  const response = await axios.post(`${apiUrl}/api/voice/submit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
  return response.data;
}
