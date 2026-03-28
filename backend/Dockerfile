FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Train models if train.csv exists, then start server
# If models are already pre-built, training is skipped
EXPOSE 5000

CMD ["sh", "-c", "if [ -f train.csv ] && [ ! -d models ]; then python train_model.py; fi && gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app"]
