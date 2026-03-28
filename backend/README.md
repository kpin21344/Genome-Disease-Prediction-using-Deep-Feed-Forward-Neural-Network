# GeneSight Backend API

## Quick Start

### 1. Train the models
```bash
cd backend
pip install -r requirements.txt

# Place your training CSV as train.csv
python train_model.py
```

### 2. Run the API server
```bash
python app.py
# Server starts at http://localhost:5000
```

### 3. With Docker
```bash
cd backend

# Place train.csv in this directory
docker build -t genesight-api .
docker run -p 5000:5000 genesight-api
```

## API Endpoints

### `POST /predict`
Send patient data as JSON, get prediction results.

### `GET /health`
Check if models are loaded and their accuracies.

## Connecting to the Frontend
Set the environment variable or update the frontend config:
```
VITE_API_URL=http://localhost:5000
```
