# FleetFlow - Quantum Route Optimization

A hybrid quantum-classical web application for multi-vehicle, multi-delivery route optimization using the Vehicle Routing Problem (VRP) approach.

## 🚀 Features

- **Quantum Optimization**: Uses QAOA (Quantum Approximate Optimization Algorithm) for route optimization
- **Classical Fallback**: OR-Tools integration with automatic fallback when quantum optimization times out
- **Real-time Visualization**: Interactive Leaflet map with animated route display
- **Performance Metrics**: Comprehensive KPIs including distance, time, CO₂ savings, and optimization time
- **Circuit Visualization**: Interactive QAOA circuit visualization with animation controls
- **WebSocket Updates**: Real-time progress updates during optimization
- **Demo Mode**: Pre-configured with 10 cities in India for immediate testing

## 🏗️ Architecture

```
fleetflow-prototype/
├── backend/                 # FastAPI Python backend
│   ├── app/
│   │   ├── main.py         # FastAPI application with endpoints
│   │   ├── quantum_solver.py # QAOA implementation
│   │   ├── classical_solver.py # OR-Tools solver
│   │   └── graph_builder.py # Distance calculations & graph handling
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile          # Backend container
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── MapComponent.js      # Leaflet map
│   │   │   ├── Sidebar.js           # Input controls
│   │   │   ├── MetricsPanel.js      # Performance metrics
│   │   │   └── CircuitVisualizer.js # QAOA circuit viz
│   │   ├── App.js          # Main application
│   │   └── index.js        # Entry point
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile          # Frontend container
└── docker-compose.yml      # Service orchestration
```

## 🛠️ Tech Stack

### Backend
- **Python 3.11** with FastAPI
- **Qiskit** for quantum computing (QAOA algorithm)
- **OR-Tools** for classical optimization
- **OSMNX & NetworkX** for graph processing
- **WebSockets** for real-time communication

### Frontend
- **React 18** with modern hooks
- **Leaflet** for interactive maps
- **Recharts** for data visualization
- **Tailwind CSS** for styling
- **Lucide React** for icons

### DevOps
- **Docker** containerization
- **Docker Compose** for orchestration

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available

### 1. Clone and Setup
```bash
git clone <repository-url>
cd fleetflow-prototype
```

### 2. Run with Docker
```bash
docker-compose up --build
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🎯 Demo Scenario

The application comes pre-configured with a demo scenario:
- **Depot**: Amaravati, Andhra Pradesh, India
- **Delivery Points**: 10 major cities across India
- **Vehicles**: 3 delivery vehicles
- **Default Action**: Click "Optimize with Quantum" to see the magic happen!

## 🔧 API Endpoints

### Core Endpoints
- `POST /api/optimize/quantum` - Quantum optimization with QAOA
- `POST /api/optimize/classical` - Classical optimization with OR-Tools
- `GET /api/demo-data` - Pre-configured demo data
- `GET /api/graph/{location}` - Street network data
- `GET /ws/telemetry` - WebSocket for real-time updates

### Request Format
```json
{
  "depot_location": {
    "address": "Amaravati, India",
    "latitude": 16.5744,
    "longitude": 80.6556
  },
  "delivery_points": [
    {
      "address": "Vijayawada, India",
      "latitude": 16.5062,
      "longitude": 80.6480
    }
  ],
  "vehicle_count": 3
}
```

## 🧮 Quantum Algorithm Details

### QAOA Implementation
- **Circuit Depth**: 8 gates
- **Qubits**: 24 quantum bits
- **Parameters**: 16 classical parameters
- **Layers**: 2 alternating cost/mixer Hamiltonians
- **Shots**: 1024 measurements
- **Optimizer**: COBYLA with 100 max iterations
- **Timeout**: 30 seconds with classical fallback

### QUBO Formulation
The VRP problem is encoded as a Quadratic Unconstrained Binary Optimization (QUBO) problem with:
- Binary variables for each possible edge and vehicle
- Distance minimization objective
- Constraints for route validity, depot start/end, and flow conservation

## 📊 Performance Metrics

The application tracks and displays:
- **Total Distance** (km) with percentage improvements
- **Estimated Time** (minutes) for route completion
- **CO₂ Savings** (kg) based on fuel consumption
- **Optimization Time** (seconds) for algorithm execution
- **Route Distribution** across vehicles
- **Vehicle Performance** comparisons

## 🎨 UI Features

### Dark Theme
- Modern slate color scheme
- Quantum-inspired blue-purple gradients
- Responsive design for all screen sizes

### Interactive Elements
- Real-time progress bars
- Animated route drawing
- Circuit layer animations
- Hover effects and transitions

### Responsive Layout
- Collapsible sidebar
- Toggle-able metrics and circuit panels
- Mobile-friendly controls

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :8000
   ```

2. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   docker-compose down
   docker system prune -a
   docker-compose up --build
   ```

3. **Quantum Timeout**
   - This is expected behavior for larger problems
   - The system automatically falls back to classical optimization
   - Check the circuit visualizer for timeout notifications

### Logs
```bash
# View backend logs
docker-compose logs backend

# View frontend logs
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f backend
```

## 🧪 Development

### Local Development Setup
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm start
```

### Testing
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

## 📈 Performance Considerations

### Quantum Optimization
- **Small Problems** (< 15 locations): Usually completes within timeout
- **Medium Problems** (15-25 locations): May timeout, uses classical fallback
- **Large Problems** (> 25 locations): Always uses classical fallback

### Classical Optimization
- **OR-Tools**: Handles problems up to 100+ locations efficiently
- **Guided Local Search**: Provides high-quality solutions
- **Time Limit**: 30 seconds maximum per optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Qiskit** team for quantum computing framework
- **OR-Tools** team for optimization algorithms
- **OpenStreetMap** for mapping data
- **React** and **Leaflet** communities for frontend libraries

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation at `/docs` endpoint

---

**FleetFlow** - Where quantum meets logistics optimization! 🚛⚡
