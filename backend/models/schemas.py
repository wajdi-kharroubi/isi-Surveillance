from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date, time

# ============ Enseignant Schemas ============
class EnseignantBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    prenom: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    grade: str = Field(..., min_length=1, max_length=50)
    grade_code: str = Field(..., min_length=1, max_length=10)
    code_smartex: str = Field(..., min_length=1, max_length=50)
    participe_surveillance: bool = True

class EnseignantCreate(EnseignantBase):
    pass

class EnseignantUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    prenom: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    grade: Optional[str] = Field(None, min_length=1, max_length=50)
    grade_code: Optional[str] = Field(None, min_length=1, max_length=10)
    participe_surveillance: Optional[bool] = None

class EnseignantResponse(EnseignantBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ============ Voeu Schemas ============
class VoeuBase(BaseModel):
    jour: int = Field(..., ge=1)  # Numéro du jour
    seance: str = Field(..., pattern="^(S1|S2|S3|S4)$")  # S1, S2, S3, S4
    semestre_code_libelle: str = Field(..., max_length=50)
    session_libelle: str = Field(..., max_length=50)

class VoeuCreate(VoeuBase):
    enseignant_id: int
    code_smartex_ens: Optional[str] = Field(None, max_length=50)  # Optionnel lors de la création

class VoeuUpdate(BaseModel):
    jour: Optional[int] = Field(None, ge=1)
    seance: Optional[str] = Field(None, pattern="^(S1|S2|S3|S4)$")
    semestre_code_libelle: Optional[str] = Field(None, max_length=50)
    session_libelle: Optional[str] = Field(None, max_length=50)
    code_smartex_ens: Optional[str] = Field(None, max_length=50)

class VoeuResponse(VoeuBase):
    id: int
    enseignant_id: int
    code_smartex_ens: Optional[str] = None
    enseignant_nom: Optional[str] = None  # Nom de l'enseignant
    enseignant_prenom: Optional[str] = None  # Prénom de l'enseignant
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============ Examen Schemas ============
class ExamenBase(BaseModel):
    dateExam: date
    h_debut: time
    h_fin: time
    session: str = Field(..., max_length=50)  # P, C, Principale, Contrôle
    type_ex: str = Field(..., max_length=50)
    semestre: str = Field(..., max_length=20)
    enseignant: str = Field(..., max_length=50)  # code_smartex
    cod_salle: str = Field(..., max_length=50)

class ExamenCreate(ExamenBase):
    pass

class ExamenUpdate(BaseModel):
    dateExam: Optional[date] = None
    h_debut: Optional[time] = None
    h_fin: Optional[time] = None
    session: Optional[str] = Field(None, max_length=50)
    type_ex: Optional[str] = Field(None, max_length=50)
    semestre: Optional[str] = Field(None, max_length=20)
    enseignant: Optional[str] = Field(None, max_length=50)
    cod_salle: Optional[str] = Field(None, max_length=50)

class ExamenResponse(ExamenBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ Generation Schemas ============
class GenerationRequest(BaseModel):
    min_surveillants_par_salle: int = Field(default=2, ge=1)
    allow_single_surveillant: bool = True
    priorite_grade: bool = True
    max_time_in_seconds: int = Field(default=600, ge=1, le=36000, description="Temps maximum de résolution en secondes (1s - 10h)")
    relative_gap_limit: float = Field(default=0.05, ge=0.0, le=1.0, description="Gap relatif accepté pour arrêter l'optimisation (0.05 = 5%)")

class GenerationResponse(BaseModel):
    success: bool
    message: str
    nb_affectations: int
    temps_generation: float
    warnings: List[str] = []

# ============ Statistics Schemas ============
class StatistiquesResponse(BaseModel):
    nb_enseignants: int
    nb_enseignants_actifs: int
    nb_examens: int
    nb_affectations: int
    nb_voeux: int
    taux_couverture: float

# ============ GradeConfig Schemas ============
class GradeConfigBase(BaseModel):
    grade_code: str = Field(..., min_length=1, max_length=10)
    grade_nom: str = Field(..., min_length=1, max_length=100)
    nb_surveillances: int = Field(..., ge=0, le=20)
    nb_obligatoire: int = Field(default=0, ge=0, le=20)
    nb_max: Optional[int] = Field(default=None, ge=0, le=20)

class GradeConfigCreate(GradeConfigBase):
    pass

class GradeConfigUpdate(BaseModel):
    grade_nom: Optional[str] = Field(None, min_length=1, max_length=100)
    nb_surveillances: Optional[int] = Field(None, ge=0, le=20)
    nb_obligatoire: Optional[int] = Field(None, ge=0, le=20)
    nb_max: Optional[int] = Field(None, ge=0, le=20)

class GradeConfigResponse(GradeConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
