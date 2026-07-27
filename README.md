# Predictive Monitoring Dashboard

A production-quality full-stack web application for machine predictive maintenance using the **AI4I 2020 Predictive Maintenance Dataset**.

This application is built with a Next.js 16 frontend powered by Tailwind CSS v4 and Recharts, and a FastAPI backend with SQLAlchemy, Pydantic, Scikit-learn, and report generation (PDF).

## Architecture & Features

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts, Axios.
- **Backend**: Python FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic, Scikit-learn (Random Forest Classifier), Joblib, ReportLab (PDF Reports).
- **Database**: SQLite (default local file) or PostgreSQL (configured via environment variable).
- **Security**: JWT Authentication (seeded default accounts: `admin` / `admin123` and `user` / `user123`).
- **ML Pipeline**: Cleans, preprocesses, and encodes categorical columns. Automatically trains a Random Forest model on the dataset and persists it as `model.pkl`. Auto-calculates model performance metrics (Accuracy, Precision, Recall, F1).
- **Dashboard**: Features KPI tiles, health distributions, failure classifications, sensor trends, alert indicators, search/filter controls, and PDF/CSV report exports.

---

## Directory Structure

```text
predictive-monitoring-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/             # REST Routers
│   │   ├── database/        # DB Configuration
│   │   ├── ml/              # ML training & inference pipeline
│   │   ├── models/          # SQLAlchemy Models
│   │   ├── schemas/         # Pydantic Schemas
│   │   └── utils/           # Security, PDF generators, helpers
│   ├── uploads/             # Log uploads folder
│   ├── trained_model/       # Saved model.pkl & metadata
│   ├── main.py              # Application entrypoint
│   └── test_backend.py      # Backend unit tests
├── frontend/
│   ├── app/                 # Next.js Pages & Layouts
│   ├── components/          # Reusable layout shells
│   ├── hooks/               # Auth and Theme context providers
│   ├── services/            # Axios API clients
│   └── types/               # TypeScript Definitions
└── README.md                # Configuration & Setup Guide
```

---

## Getting Started

### 1. Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **PostgreSQL** (Optional, falls back to SQLite automatically if connection URL is omitted)

---

### 2. Backend Setup & Run

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. If not already active, activate the python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

3. Configure Database connection (Optional):
   By default, the backend will auto-create a local SQLite database named `predictive_maintenance.db` inside the `backend/` folder.
   To connect to **PostgreSQL**, create a `.env` file inside the `backend/` folder and specify the connection string:
   ```env
   DATABASE_URL=postgresql://<username>:<password>@localhost:5432/<database_name>
   ```

4. Run the development server:
   ```bash
   python main.py
   ```
   The backend API will start at **http://localhost:8000** with Swagger documentation available at **http://localhost:8000/docs**.

5. Run unit tests to verify:
   ```bash
   python -m unittest test_backend.py
   ```

---

### 3. Frontend Setup & Run

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install node dependencies:
   ```bash
   npm install
   ```

3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend will be running at **http://localhost:3000**.

---

## Seeding the Dataset

1. On startup, the backend automatically scans the project folders (the root folder, `backend/`, and `backend/uploads/`) for any CSV file.
2. If the database is empty and a CSV file (e.g. `ai4i2020.csv`) is found, the backend will **automatically ingest it** and train the ML model.
3. Alternatively, you can log in as an administrator (`admin` / `admin123`) and navigate to the **Dataset Upload** page to upload the CSV manually. Uploading a new dataset will:
   - Validate and clean missing values.
   - Insert records into PostgreSQL/SQLite.
   - Retrain the machine learning model.
   - Re-populate dashboard statistics and active alerts log.

---

## Default Login Credentials

- **Administrator**: `admin` / `admin123` (Permissions: Upload datasets, trigger model retrains, view and inspect all assets)
- **Standard User**: `user` / `user123` (Permissions: View and inspect all assets, export logs)
