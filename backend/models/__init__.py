# Models package initialization
from .models import (
    Enseignant,
    Voeu,
    Examen,
    Affectation,
    GradeConfig,
    SessionArchive,
)

from .schemas import (
    EnseignantCreate,
    EnseignantUpdate,
    EnseignantExceptionUpdate,
    EnseignantResponse,
    VoeuCreate,
    VoeuUpdate,
    VoeuResponse,
    ExamenCreate,
    ExamenUpdate,
    ExamenResponse,
    GradeConfigCreate,
    GradeConfigUpdate,
    GradeConfigResponse,
    GenerationRequest,
    GenerationResponse,
    StatistiquesResponse
)

__all__ = [
    # Models
    "Enseignant",
    "Voeu",
    "Examen",
    "Affectation",
    "GradeConfig",
    "SessionArchive",
    # Schemas
    "EnseignantCreate",
    "EnseignantUpdate",
    "EnseignantExceptionUpdate",
    "EnseignantResponse",
    "VoeuCreate",
    "VoeuUpdate",
    "VoeuResponse",
    "ExamenCreate",
    "ExamenUpdate",
    "ExamenResponse",
    "GradeConfigCreate",
    "GradeConfigUpdate",
    "GradeConfigResponse",
    "GenerationRequest",
    "GenerationResponse",
    "StatistiquesResponse"
]
