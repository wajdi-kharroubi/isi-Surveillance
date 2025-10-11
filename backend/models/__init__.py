# Models package initialization
from .models import (
    Enseignant,
    Voeu,
    Salle,
    Examen,
    Affectation,
    Configuration,
    GradeConfig
)

from .schemas import (
    EnseignantCreate,
    EnseignantUpdate,
    EnseignantResponse,
    VoeuCreate,
    VoeuUpdate,
    VoeuResponse,
    SalleCreate,
    SalleUpdate,
    SalleResponse,
    ExamenCreate,
    ExamenUpdate,
    ExamenResponse,
    AffectationCreate,
    AffectationUpdate,
    AffectationResponse,
    GradeConfigCreate,
    GradeConfigUpdate,
    GradeConfigResponse,
    GenerationRequest,
    GenerationResponse,
    StatistiquesResponse,
    ExportRequest
)

__all__ = [
    # Models
    "Enseignant",
    "Voeu",
    "Salle",
    "Examen",
    "Affectation",
    "Configuration",
    "GradeConfig",
    # Schemas
    "EnseignantCreate",
    "EnseignantUpdate",
    "EnseignantResponse",
    "VoeuCreate",
    "VoeuUpdate",
    "VoeuResponse",
    "SalleCreate",
    "SalleUpdate",
    "SalleResponse",
    "ExamenCreate",
    "ExamenUpdate",
    "ExamenResponse",
    "AffectationCreate",
    "AffectationUpdate",
    "AffectationResponse",
    "GradeConfigCreate",
    "GradeConfigUpdate",
    "GradeConfigResponse",
    "GenerationRequest",
    "GenerationResponse",
    "StatistiquesResponse",
    "ExportRequest"
]
