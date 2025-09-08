# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app
COPY ./frontend/package.json ./frontend/package-lock.json ./
RUN npm install
COPY ./frontend ./
RUN npm run build

# Stage 2: Build the Python Flask backend
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY ./backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built frontend from the frontend builder
COPY --from=frontend-builder /app/build ./frontend/build

# Copy backend source code
COPY ./backend ./

# Expose port
EXPOSE 8000

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=8000

# Run the Flask app
CMD ["flask", "run"]
