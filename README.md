# Welcome GenSight(MLP) project

## Project info
Engineered features, selected them with mutual information, balanced classes with SMOTE, and compared 9 classical ML models against a deep MLP using accuracy, F1-score and confusion matrices.


Created a complete backend setup in backend/:

    train_model.py — Trains 2 scikit-learn MLPClassifiers (512→256→128, matching your Keras architecture) for Genetic Disorder and Disorder Subclass, saves as .joblib
    app.py — Flask API with /predict and /health endpoints, maps GUI fields to dataset columns
    Dockerfile — Auto-trains on build if train.csv is present, serves via gunicorn
    requirements.txt — All Python dependencies

To deploy:

    Place train.csv in backend/
    Run pip install -r requirements.txt && python train_model.py
    Run python app.py (or use Docker)
    Set VITE_API_URL=http://your-server:5000 for the frontend

Step 3: Start the Backend Server

WHY: The GUI needs a running server to send patient data to and get predictions back.

python app.py

You should see: Running on http://localhost:5000. Keep this terminal open.

Step 4: Start the Frontend

WHY: This is the visual dashboard you interact with.

Open a second terminal, go to the project root:

npm install
npm run dev

Opens at http://localhost:8080. The frontend is already configured to talk to localhost:5000
