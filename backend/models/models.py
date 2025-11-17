from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Date,
    Time,
    Text,
    Index,
)
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
    abrv_ens = Column(
        String(50), nullable=True
    )  # Abréviation de l'enseignant (ex: P.NOM)
    participe_surveillance = Column(Boolean, default=True)
    nombre_max = Column(
        Integer, default=4, nullable=False
    )  # Nombre max de séances par jour
    is_Exception = Column(
        Boolean, default=False, nullable=False
    )  # Si l'enseignant a un quota exceptionnel
    quota_Exception = Column(
        Integer, nullable=True
    )  # Quota de surveillances exceptionnel
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    voeux = relationship(
        "Voeu", back_populates="enseignant", cascade="all, delete-orphan"
    )
    affectations = relationship(
        "Affectation", back_populates="enseignant", cascade="all, delete-orphan"
    )
    # Présences/Absences enregistrées par séance
    presences = relationship(
        "Presence", back_populates="enseignant", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Enseignant {self.nom} {self.prenom} ({self.grade_code})>"


class Voeu(Base):
    __tablename__ = "voeux"

    id = Column(Integer, primary_key=True, index=True)
    enseignant_id = Column(Integer, ForeignKey("enseignants.id"), nullable=False, index=True)
    code_smartex_ens = Column(
        String(50), nullable=True, index=True
    )  # Code smartex de l'enseignant
    semestre_code_libelle = Column(
        String(50), nullable=True, index=True  # Index ajouté pour filtres fréquents
    )  # "Semestre1", "Semestre2" - colonne "Semestre" dans Excel
    session_libelle = Column(
        String(50), nullable=True, index=True  # Index ajouté pour filtres fréquents
    )  # "Partiel", "Examen", "Rattrapage" - colonne "Session" dans Excel
    date_voeu = Column(
        Date, nullable=True
    )  # Date du vœu (format j/m/a) - colonne "Date" dans Excel
    jour = Column(
        String(20), nullable=False, index=True  # Index ajouté pour filtres fréquents
    )  # Nom du jour (Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi) - colonne "Jour" dans Excel
    seance = Column(
        String(10), nullable=False, index=True  # Index ajouté pour filtres fréquents
    )  # Code séance (S1, S2, S3, S4) - colonne "Séances" dans Excel (peut être multiple, un vœu par séance)
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
    session = Column(
        String(10), nullable=False, index=True  # Index ajouté pour filtres fréquents
    )  # Pa (Partiel), P (Principale), C (Contrôle), R (Rattrapage)
    type_ex = Column(
        String(50), nullable=False
    )  # Écrit, TP, Oral - correspond à colonne Excel
    semestre = Column(
        String(20), nullable=False, index=True  # Index ajouté pour filtres fréquents
    )  # SEMESTRE 1, SEMESTRE 2 - correspond à colonne Excel
    enseignant = Column(
        String(50), nullable=False, index=True  # Index ajouté pour jointures fréquentes
    )  # Code smartex de l'enseignant - correspond à colonne Excel
    cod_salle = Column(
        String(50), nullable=False, index=True
    )  # Code de la salle - correspond à colonne Excel
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    affectations = relationship("Affectation", back_populates="examen")

    def __repr__(self):
        return f"<Examen {self.dateExam} {self.h_debut}-{self.h_fin} Salle:{self.cod_salle}>"


class Affectation(Base):
    __tablename__ = "affectations"

    id = Column(Integer, primary_key=True, index=True)
    examen_id = Column(Integer, ForeignKey("examens.id"), nullable=False, index=True)
    enseignant_id = Column(Integer, ForeignKey("enseignants.id"), nullable=False, index=True)
    cod_salle = Column(
        String(50), nullable=False, index=True
    )  # Code salle directement au lieu de salle_id
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


class GenerationStatistique(Base):
    """Statistiques d'une génération de planning"""

    __tablename__ = "generation_statistiques"

    id = Column(Integer, primary_key=True, index=True)
    date_generation = Column(DateTime, default=datetime.utcnow, nullable=False)
    nb_affectations = Column(Integer, nullable=False)
    temps_generation = Column(Integer, nullable=False)  # En secondes

    # Statistiques des souhaits
    nb_souhaits_total = Column(Integer, nullable=False, default=0)
    nb_souhaits_respectes = Column(Integer, nullable=False, default=0)
    nb_souhaits_violes = Column(Integer, nullable=False, default=0)
    taux_souhaits_respectes = Column(Integer, nullable=False, default=0)  # Pourcentage

    # Statistiques des responsables
    nb_responsables_total = Column(
        Integer, nullable=False, default=0
    )  # Responsables pouvant surveiller uniquement
    nb_responsables_presents = Column(Integer, nullable=False, default=0)
    nb_responsables_absents = Column(
        Integer, nullable=False, default=0
    )  # Absents parmi ceux pouvant surveiller
    nb_responsables_non_participants = Column(
        Integer, nullable=False, default=0
    )  # Responsables ne participant pas aux surveillances
    taux_responsables_presents = Column(
        Integer, nullable=False, default=0
    )  # Pourcentage

    # Statistiques des contraintes de séances par jour
    nb_contraintes_seances_total = Column(Integer, nullable=False, default=0)
    nb_contraintes_seances_respectees = Column(Integer, nullable=False, default=0)
    nb_contraintes_seances_violees = Column(Integer, nullable=False, default=0)
    taux_contraintes_seances_respectees = Column(
        Integer, nullable=False, default=0
    )  # Pourcentage

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    souhaits_violes = relationship(
        "SouhaitViole",
        back_populates="generation_statistique",
        cascade="all, delete-orphan",
    )
    responsables_absents = relationship(
        "ResponsableAbsent",
        back_populates="generation_statistique",
        cascade="all, delete-orphan",
    )
    depassements_max_jour = relationship(
        "DepassementMaxJour",
        back_populates="generation_statistique",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<GenerationStatistique {self.date_generation} - {self.nb_affectations} affectations>"


class SouhaitViole(Base):
    """Enregistrement d'un souhait violé lors de la génération"""

    __tablename__ = "souhaits_violes"

    id = Column(Integer, primary_key=True, index=True)
    generation_statistique_id = Column(
        Integer, ForeignKey("generation_statistiques.id"), nullable=False
    )
    enseignant_id = Column(Integer, ForeignKey("enseignants.id"), nullable=False)
    enseignant_nom = Column(String(100), nullable=False)
    enseignant_prenom = Column(String(100), nullable=False)
    code_smartex = Column(String(50), nullable=False)
    date_exam = Column(Date, nullable=False)
    seance = Column(String(10), nullable=False)
    jour = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    generation_statistique = relationship(
        "GenerationStatistique", back_populates="souhaits_violes"
    )
    enseignant = relationship("Enseignant")

    def __repr__(self):
        return f"<SouhaitViole {self.enseignant_nom} {self.enseignant_prenom} - {self.date_exam} {self.seance}>"


class ResponsableAbsent(Base):
    """Enregistrement d'un responsable absent lors de la génération (groupé par enseignant/date/séance)"""

    __tablename__ = "responsables_absents"

    id = Column(Integer, primary_key=True, index=True)
    generation_statistique_id = Column(
        Integer, ForeignKey("generation_statistiques.id"), nullable=False
    )
    enseignant_id = Column(Integer, ForeignKey("enseignants.id"), nullable=False)
    enseignant_nom = Column(String(100), nullable=False)
    enseignant_prenom = Column(String(100), nullable=False)
    code_smartex = Column(String(50), nullable=False)
    date_exam = Column(Date, nullable=False)
    seance = Column(String(10), nullable=False)
    salle = Column(String(50), nullable=True)  # Optionnel (déprécié après groupement)
    nb_examens = Column(Integer, nullable=False, default=1)  # Nombre d'examens groupés
    raison = Column(
        String(50), nullable=True, default="autre"
    )  # 'non_surveillant' ou 'autre'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    generation_statistique = relationship(
        "GenerationStatistique", back_populates="responsables_absents"
    )
    enseignant = relationship("Enseignant")

    def __repr__(self):
        return f"<ResponsableAbsent {self.enseignant_nom} {self.enseignant_prenom} - {self.date_exam} {self.seance} ({self.nb_examens} examens)>"


class DepassementMaxJour(Base):
    """Enregistrement d'un dépassement du nombre max de séances par jour"""

    __tablename__ = "depassements_max_jour"

    id = Column(Integer, primary_key=True, index=True)
    generation_statistique_id = Column(
        Integer, ForeignKey("generation_statistiques.id"), nullable=False
    )
    enseignant_id = Column(Integer, ForeignKey("enseignants.id"), nullable=False)
    enseignant_nom = Column(String(100), nullable=False)
    enseignant_prenom = Column(String(100), nullable=False)
    code_smartex = Column(String(50), nullable=False)
    date_exam = Column(Date, nullable=False)
    nb_seances = Column(Integer, nullable=False)
    max_autorise = Column(Integer, nullable=False)
    depassement = Column(Integer, nullable=False)
    seances = Column(
        String(100), nullable=False
    )  # Liste des séances (ex: "S1, S2, S3")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    generation_statistique = relationship(
        "GenerationStatistique", back_populates="depassements_max_jour"
    )
    enseignant = relationship("Enseignant")

    def __repr__(self):
        return f"<DepassementMaxJour {self.enseignant_nom} {self.enseignant_prenom} - {self.date_exam} ({self.nb_seances}/{self.max_autorise})>"


class Presence(Base):
    """Enregistrement de la présence/absence d'un enseignant pour une séance (groupée par date+h_debut+h_fin+session+semestre).
    On utilise ce modèle pour marquer si un enseignant était présent ou absent pour une séance donnée.
    """

    __tablename__ = "presences"

    id = Column(Integer, primary_key=True, index=True)
    enseignant_id = Column(Integer, ForeignKey("enseignants.id"), nullable=False, index=True)
    date_exam = Column(Date, nullable=False, index=True)
    h_debut = Column(Time, nullable=False)
    h_fin = Column(Time, nullable=False)
    session = Column(String(20), nullable=False, index=True)
    semestre = Column(String(20), nullable=False, index=True)
    present = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    enseignant = relationship("Enseignant", back_populates="presences")

    # Index composite pour optimiser les recherches par séance
    __table_args__ = (
        Index('idx_presence_composite', 'date_exam', 'h_debut', 'h_fin', 'session', 'semestre', 'enseignant_id'),
    )

    def __repr__(self):
        return f"<Presence Enseignant:{self.enseignant_id} {self.date_exam} {self.h_debut}-{self.h_fin} present:{self.present}>"


class SessionArchive(Base):
    """Archive d'une session de planning validée avec snapshot complet des données"""

    __tablename__ = "sessions_archives"

    id = Column(Integer, primary_key=True, index=True)
    nom_session = Column(String(200), nullable=False, index=True)  # Ex: "Session Partiel - Semestre 1 - 2024"
    semestre = Column(String(20), nullable=False, index=True)  # SEMESTRE 1, SEMESTRE 2
    session = Column(String(10), nullable=False, index=True)  # Pa (Partiel), P (Principale), C (Contrôle), R (Rattrapage)
    annee_universitaire = Column(String(20), nullable=False, index=True)  # Ex: "2024-2025"
    date_debut = Column(Date, nullable=False, index=True)
    date_fin = Column(Date, nullable=False, index=True)
    date_archivage = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_validation = Column(DateTime, nullable=True)  # Date de la validation avant archivage
    
    # Métadonnées
    nb_examens = Column(Integer, nullable=False, default=0)
    nb_affectations = Column(Integer, nullable=False, default=0)
    nb_enseignants = Column(Integer, nullable=False, default=0)
    nb_voeux = Column(Integer, nullable=False, default=0)
    
    # Snapshot des données en JSON
    snapshot_examens = Column(Text, nullable=False)  # JSON des examens
    snapshot_affectations = Column(Text, nullable=False)  # JSON des affectations
    snapshot_enseignants = Column(Text, nullable=False)  # JSON des enseignants participant
    snapshot_voeux = Column(Text, nullable=True)  # JSON des vœux des enseignants
    snapshot_presences = Column(Text, nullable=True)  # JSON des présences/absences
    snapshot_quotas_grades = Column(Text, nullable=True)  # JSON des quotas par grade
    snapshot_exceptions = Column(Text, nullable=True)  # JSON des exceptions (souhaits violés, responsables absents, dépassements)
    snapshot_generation_statistique = Column(Text, nullable=True)  # JSON de la dernière génération statistique complète
    
    # Statistiques de la génération (si disponibles)
    generation_statistique_id = Column(
        Integer, ForeignKey("generation_statistiques.id"), nullable=True
    )
    
    # Notes et commentaires
    commentaire = Column(Text, nullable=True)
    archive_par = Column(String(100), nullable=True)  # Nom de l'utilisateur ayant archivé
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    generation_statistique = relationship("GenerationStatistique", foreign_keys=[generation_statistique_id])

    def __repr__(self):
        return f"<SessionArchive {self.nom_session} - {self.annee_universitaire}>"
