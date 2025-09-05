.PHONY: help build up down logs clean test dev-backend dev-frontend install-backend install-frontend

help: ## Show this help message
	@echo "FleetFlow - Quantum Route Optimization"
	@echo "====================================="
	@echo ""
	@echo "Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build Docker images
	docker-compose build

up: ## Start the application
	docker-compose up -d

down: ## Stop the application
	docker-compose down

logs: ## View application logs
	docker-compose logs -f

clean: ## Clean up Docker resources
	docker-compose down -v
	docker system prune -f

test: ## Run tests
	@echo "Running backend tests..."
	cd backend && python -m pytest
	@echo "Running frontend tests..."
	cd frontend && npm test

dev-backend: ## Start backend in development mode
	cd backend && python -m venv venv
	cd backend && source venv/bin/activate && pip install -r requirements.txt
	cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start frontend in development mode
	cd frontend && npm install
	cd frontend && npm start

install-backend: ## Install backend dependencies
	cd backend && python -m venv venv
	cd backend && source venv/bin/activate && pip install -r requirements.txt

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

status: ## Check application status
	@echo "Checking Docker containers..."
	docker-compose ps
	@echo ""
	@echo "Checking ports..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

restart: ## Restart the application
	docker-compose restart

rebuild: ## Rebuild and restart
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

health: ## Check application health
	@echo "Checking backend health..."
	curl -f http://localhost:8000/health || echo "Backend is down"
	@echo "Checking frontend..."
	curl -f http://localhost:3000 || echo "Frontend is down"

demo: ## Load demo data and run optimization
	@echo "Loading demo data..."
	curl -X GET http://localhost:8000/api/demo-data
	@echo ""
	@echo "Demo data loaded. Open http://localhost:3000 to start optimization!"

setup: ## Complete setup for first time
	@echo "Setting up FleetFlow application..."
	make build
	make up
	@echo "Waiting for services to start..."
	sleep 30
	make health
	@echo ""
	@echo "Setup complete! Access the application at http://localhost:3000"
