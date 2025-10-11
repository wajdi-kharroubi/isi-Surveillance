import os
from pathlib import Path

# Application Settings
APP_NAME = "Gestion Surveillances"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "True") == "True"

# Server Settings
HOST = "127.0.0.1"
PORT = 8000
RELOAD = DEBUG

# Database
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_DIR = BASE_DIR / "database"
DATABASE_DIR.mkdir(exist_ok=True)
DATABASE_URL = f"sqlite:///{DATABASE_DIR}/surveillance.db"

# File Upload Settings
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

# Export Settings
EXPORT_DIR = BASE_DIR / "exports"
EXPORT_DIR.mkdir(exist_ok=True)

# Surveillance Configuration
MIN_SURVEILLANTS_PAR_SALLE = 2
MIN_SURVEILLANTS_FALLBACK = 1  # En cas de manque

# Session Types
SESSIONS = ["Normale", "Rattrapage", "Contrôle Continu"]
SEANCES = ["Matin", "Après-midi"]
TYPES_EXAMEN = ["Écrit", "TP", "Oral"]

# Grades Enseignants (ordre hiérarchique)
GRADES = {
    "PES": {"nom": "Professeur de l'Enseignement Supérieur", "code": "PES", "nb_surveillances": 3},
    "PR": {"nom": "Professeur", "code": "PR", "nb_surveillances": 4},
    "MC": {"nom": "Maître de Conférences", "code": "MC", "nb_surveillances": 5},
    "MA": {"nom": "Maître Assistant", "code": "MA", "nb_surveillances": 6},
    "AC": {"nom": "Assistant Contractuel", "code": "AC", "nb_surveillances": 7},
    "AS": {"nom": "Assistant", "code": "AS", "nb_surveillances": 8},
    "PTC": {"nom": "Personnel Technique et Contractuel", "code": "PTC", "nb_surveillances": 9},
    "VA": {"nom": "Vacataire", "code": "VA", "nb_surveillances": 10},
    "V": {"nom": "Visiteur", "code": "V", "nb_surveillances": 10},
    "EX": {"nom": "Expert Externe", "code": "EX", "nb_surveillances": 5}
}

# CORS Settings
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
]

# Logging
LOG_LEVEL = "INFO" if not DEBUG else "DEBUG"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
