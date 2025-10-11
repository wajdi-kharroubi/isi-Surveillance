from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging

from database import init_db
from config import HOST, PORT, RELOAD, CORS_ORIGINS, LOG_LEVEL, LOG_FORMAT

# Configuration du logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# Création de l'application FastAPI
app = FastAPI(
    title="API Gestion Surveillances",
    description="API pour la gestion et génération des créneaux de surveillance des examens",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import des routers
from api import enseignants, examens, voeux, imports, generation, export, statistiques, grades, planning

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

# Routes de base
@app.get("/")
def root():
    """Route racine"""
    return {
        "application": "Gestion Surveillances",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs"
    }

@app.get("/api/health")
def health_check():
    """Vérification de l'état du service"""
    return {
        "status": "healthy",
        "service": "surveillance-api"
    }

@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info("🚀 Démarrage de l'application...")
    
    # Initialiser la base de données
    init_db()
    logger.info("✅ Base de données initialisée")
    
    logger.info(f"📡 API disponible sur http://{HOST}:{PORT}")
    logger.info(f"📚 Documentation sur http://{HOST}:{PORT}/api/docs")

@app.on_event("shutdown")
async def shutdown_event():
    """Actions à l'arrêt de l'application"""
    logger.info("🛑 Arrêt de l'application...")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=RELOAD,
        log_level=LOG_LEVEL.lower()
    )
