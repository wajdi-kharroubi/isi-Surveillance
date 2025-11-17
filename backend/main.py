import sys
import os
from dotenv import load_dotenv

# Load .env file - handle both development and PyInstaller frozen mode
if getattr(sys, 'frozen', False):
    # Running as PyInstaller bundle - .env is in _MEIPASS
    base_path = sys._MEIPASS
    dotenv_path = os.path.join(base_path, '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
    else:
        print(f"Warning: .env file not found at {dotenv_path}")
else:
    # Running in development mode
    load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging

from database import init_db
from config import HOST, PORT, RELOAD, CORS_ORIGINS, LOG_LEVEL, LOG_FORMAT, DEBUG

# Configuration du logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# Création de l'application FastAPI
app = FastAPI(
    title="API Gestion Surveillances",
    description="API pour la gestion et génération des créneaux de surveillance des examens",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    # In development allow all origins to avoid CORS issues with local dev servers.
    # In production this should be restricted to trusted origins only.
    allow_origins=(CORS_ORIGINS if not DEBUG else ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import des routers
from api import (
    enseignants,
    examens,
    voeux,
    imports,
    generation,
    export,
    statistiques,
    grades,
    planning,
    decision,
    archives,
)

# Enregistrement des routers
app.include_router(enseignants.router, prefix="/api")
app.include_router(examens.router, prefix="/api")
app.include_router(voeux.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(statistiques.router, prefix="/api")
app.include_router(grades.router, prefix="/api")
app.include_router(planning.router, prefix="/api")
app.include_router(decision.router, prefix="/api")
app.include_router(archives.router, prefix="/api")


# Routes de base
@app.get("/")
def root():
    """Route racine"""
    return {
        "application": "Gestion Surveillances",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs",
    }


@app.get("/api/health")
def health_check():
    """Vérification de l'état du service"""
    return {"status": "healthy", "service": "surveillance-api"}


@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info("Demarrage de l'application...")
    
    # Log data directory location
    from config import BASE_DIR, DATABASE_DIR, UPLOAD_DIR, EXPORT_DIR
    logger.info(f"Base directory: {BASE_DIR}")
    logger.info(f"Database directory: {DATABASE_DIR}")
    logger.info(f"Upload directory: {UPLOAD_DIR}")
    logger.info(f"Export directory: {EXPORT_DIR}")

    # Initialiser la base de données
    init_db()
    logger.info("Base de donnees initialisee")

    logger.info(f"API disponible sur http://{HOST}:{PORT}")
    logger.info(f"Documentation sur http://{HOST}:{PORT}/api/docs")


@app.on_event("shutdown")
async def shutdown_event():
    """Actions à l'arrêt de l'application"""
    logger.info("Arret de l'application...")


if __name__ == "__main__":
    import sys
    import os

    # Detect if running as PyInstaller executable
    is_frozen = getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")

    if is_frozen:
        # Running as executable
        # Set up logging to file in AppData (not Program Files - permissions!)
        from config import BASE_DIR
        log_file = os.path.join(BASE_DIR, "backend.log")
        
        # Ensure BASE_DIR exists
        os.makedirs(BASE_DIR, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file, mode='w', encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(file_handler)
        
        # Also log to console
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        logger.addHandler(console_handler)
        
        logger.info(f"=== Backend starting in FROZEN mode ===")
        logger.info(f"Executable location: {sys.executable}")
        logger.info(f"Working directory: {os.getcwd()}")
        logger.info(f"Log file: {log_file}")
        
        # Log Gmail OAuth configuration status
        google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        if google_client_id:
            logger.info(f"Gmail OAuth configured: YES (client_id: {google_client_id[:20]}...)")
        else:
            logger.warning("Gmail OAuth configured: NO - Email features will not work")
        
        try:
            # Running as executable - use simpler uvicorn config
            uvicorn.run(
                app,  # Pass app directly instead of string
                host=HOST,
                port=PORT,
                log_config=None,  # Disable default logging config
                access_log=False,  # Disable access logs
            )
        except Exception as e:
            logger.error(f"Failed to start backend: {e}", exc_info=True)
            import traceback
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write("\n\n=== EXCEPTION ===\n")
                traceback.print_exc(file=f)
            raise
    else:
        # Running in development - use normal logging
        uvicorn.run(
            "main:app", host=HOST, port=PORT, reload=RELOAD, log_level=LOG_LEVEL.lower()
        )
