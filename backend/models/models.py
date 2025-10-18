from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Time, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Enseignant(Base):
    __tablename__ = "enseignants"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    grade = Column(String(50), nullable=False)
    grade_code = Column(String(10), nullable=False)
    code_smartex = Column(String(50), unique=True, nullable=False, index=True)
    abrv_ens = Column(String(50), nullable=True)  # Abréviation de l'enseignant (ex: P.NOM)
    participe_surveillance = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    voeux = relationship("Voeu", back_populates="enseignant", cascade="all, delete-orphan")
    affectations = relationship("Affectation", back_populates="enseignant", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Enseignant {self.nom} {self.prenom} ({self.grade_code})>"


class Voeu(Base):
    __tablename__ = "voeux"

    id = Column(Integer, primary_key=True, index=True)
    enseignant_id = Column(Integer, ForeignKey("enseignants.id"), nullable=False)
    code_smartex_ens = Column(String(50), nullable=True, index=True)  # Ajouté : code smartex de l'enseignant
    semestre_code_libelle = Column(String(50), nullable=True)  # "Semestre 1", "Semestre 2" - correspond à colonne Excel
    session_libelle = Column(String(50), nullable=True)  # "Principale", "Contrôle" - correspond à colonne Excel
    jour = Column(Integer, nullable=False)  # Indice du jour (1, 2, 3...) - correspond à colonne Excel
    seance = Column(String(10), nullable=False)  # Code séance (S1, S2, S3, S4) - correspond à colonne Excel
    motif = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    enseignant = relationship("Enseignant", back_populates="voeux")

    def __repr__(self):
        return f"<Voeu {self.enseignant_id} - Jour {self.jour} Séance {self.seance}>"


class Examen(Base):
    __tablename__ = "examens"

    id = Column(Integer, primary_key=True, index=True)
    dateExam = Column(Date, nullable=False, index=True)  # Correspond à colonne Excel
    h_debut = Column(Time, nullable=False)  # Correspond à colonne Excel
    h_fin = Column(Time, nullable=False)  # Correspond à colonne Excel
    session = Column(String(10), nullable=False)  # P ou C dans Excel → transformé en Principale/Contrôle
    type_ex = Column(String(50), nullable=False)  # Écrit, TP, Oral - correspond à colonne Excel
    semestre = Column(String(20), nullable=False)  # SEMESTRE 1, SEMESTRE 2 - correspond à colonne Excel
    enseignant = Column(String(50), nullable=False)  # Code smartex de l'enseignant - correspond à colonne Excel
    cod_salle = Column(String(50), nullable=False, index=True)  # Code de la salle - correspond à colonne Excel
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    affectations = relationship("Affectation", back_populates="examen")

    def __repr__(self):
        return f"<Examen {self.dateExam} {self.h_debut}-{self.h_fin} Salle:{self.cod_salle}>"


class Affectation(Base):
    __tablename__ = "affectations"

    id = Column(Integer, primary_key=True, index=True)
    examen_id = Column(Integer, ForeignKey("examens.id"), nullable=False)
    enseignant_id = Column(Integer, ForeignKey("enseignants.id"), nullable=False)
    cod_salle = Column(String(50), nullable=False)  # Code salle directement au lieu de salle_id
    est_responsable = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    enseignant = relationship("Enseignant", back_populates="affectations")
    examen = relationship("Examen", back_populates="affectations")

    def __repr__(self):
        return f"<Affectation Examen:{self.examen_id} Enseignant:{self.enseignant_id} Salle:{self.cod_salle}>"


class GradeConfig(Base):
    """Configuration du nombre de surveillances par grade"""
    __tablename__ = "grade_config"

    id = Column(Integer, primary_key=True, index=True)
    grade_code = Column(String(10), unique=True, nullable=False, index=True)
    grade_nom = Column(String(100), nullable=False)
    nb_surveillances = Column(Integer, nullable=False, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<GradeConfig {self.grade_code}: {self.nb_surveillances} surveillances>"