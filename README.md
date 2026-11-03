# AI Behavioral Framework for Early Neurological Risk Screening – Parkinson's Disease

This repository contains a research-focused web application for early behavioral risk screening. It is not a medical diagnostic system.

## Structure

- `frontend/`: React + Vite user interface
- `backend/`: FastAPI backend API
- `ml/`: modality-specific feature extraction and model training code
- `data/`: raw and processed data storage
- `models/`: trained model artifacts
- `docs/`: architecture and methodology documentation

## Phase 1: Project setup

The project currently contains the frontend and backend scaffold and the Typing Test module structure.

## Running the application

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
