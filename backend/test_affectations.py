"""
Tests pour les endpoints de gestion des affectations d'enseignants
"""
import pytest
from datetime import date, time
from fastapi.testclient import TestClient
from main import app
from database import get_db, SessionLocal
from models.models import Enseignant, Examen, Affectation

client = TestClient(app)


@pytest.fixture
def db_session():
    """Fixture pour la session de base de données"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_enseignant(db_session):
    """Crée un enseignant de test"""
    enseignant = Enseignant(
        nom="Dupont",
        prenom="Jean",
        email="jean.dupont@test.com",
        grade="Maître de Conférences Classe A",
        grade_code="MCA",
        code_smartex="ENS001",
        participe_surveillance=True
    )
    db_session.add(enseignant)
    db_session.commit()
    db_session.refresh(enseignant)
    return enseignant


@pytest.fixture
def sample_examens(db_session):
    """Crée des examens de test pour une même séance"""
    examens = [
        Examen(
            dateExam=date(2024, 1, 15),
            h_debut=time(8, 30),
            h_fin=time(10, 30),
            session="Principale",
            type_ex="Écrit",
            semestre="SEMESTRE 1",
            enseignant="ENS999",
            cod_salle=f"S{i:02d}"
        ) for i in range(1, 6)
    ]
    
    for examen in examens:
        db_session.add(examen)
    
    db_session.commit()
    for examen in examens:
        db_session.refresh(examen)
    
    return examens


class TestAjouterEnseignantSeance:
    """Tests pour l'endpoint d'ajout d'enseignant à une séance"""
    
    def test_ajouter_enseignant_success(self, db_session, sample_enseignant, sample_examens):
        """Test d'ajout réussi d'un enseignant à une séance"""
        response = client.post(
            "/planning/ajouter-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1",
                "est_responsable": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["nb_affectations_modifiees"] == 5
        assert "Dupont Jean" in data["message"]
        
        # Vérifier que les affectations ont été créées en base
        affectations = db_session.query(Affectation).filter(
            Affectation.enseignant_id == sample_enseignant.id
        ).all()
        assert len(affectations) == 5
    
    def test_ajouter_enseignant_responsable(self, db_session, sample_enseignant, sample_examens):
        """Test d'ajout d'un enseignant comme responsable"""
        response = client.post(
            "/planning/ajouter-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1",
                "est_responsable": True
            }
        )
        
        assert response.status_code == 200
        
        # Vérifier que l'enseignant est marqué comme responsable
        affectations = db_session.query(Affectation).filter(
            Affectation.enseignant_id == sample_enseignant.id
        ).all()
        assert all(aff.est_responsable for aff in affectations)
    
    def test_ajouter_enseignant_inexistant(self):
        """Test d'ajout d'un enseignant inexistant"""
        response = client.post(
            "/planning/ajouter-enseignant-seance",
            json={
                "enseignant_id": 99999,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1",
                "est_responsable": False
            }
        )
        
        assert response.status_code == 404
        assert "introuvable" in response.json()["detail"]
    
    def test_ajouter_seance_inexistante(self, db_session, sample_enseignant):
        """Test d'ajout à une séance inexistante"""
        response = client.post(
            "/planning/ajouter-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-12-31",
                "h_debut": "23:00:00",
                "h_fin": "23:59:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1",
                "est_responsable": False
            }
        )
        
        assert response.status_code == 404
        assert "Aucun examen trouvé" in response.json()["detail"]
    
    def test_ajouter_enseignant_deja_affecte(self, db_session, sample_enseignant, sample_examens):
        """Test d'ajout d'un enseignant déjà affecté"""
        # Premier ajout
        client.post(
            "/planning/ajouter-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1",
                "est_responsable": False
            }
        )
        
        # Tentative de second ajout
        response = client.post(
            "/planning/ajouter-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1",
                "est_responsable": False
            }
        )
        
        assert response.status_code == 400
        assert "déjà affecté" in response.json()["detail"]
    
    def test_ajouter_enseignant_non_participant(self, db_session, sample_examens):
        """Test d'ajout d'un enseignant qui ne participe pas aux surveillances"""
        # Créer un enseignant non participant
        enseignant = Enseignant(
            nom="Martin",
            prenom="Pierre",
            email="pierre.martin@test.com",
            grade="Professeur",
            grade_code="PR",
            code_smartex="ENS002",
            participe_surveillance=False
        )
        db_session.add(enseignant)
        db_session.commit()
        db_session.refresh(enseignant)
        
        response = client.post(
            "/planning/ajouter-enseignant-seance",
            json={
                "enseignant_id": enseignant.id,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1",
                "est_responsable": False
            }
        )
        
        assert response.status_code == 400
        assert "ne participe pas aux surveillances" in response.json()["detail"]


class TestSupprimerEnseignantSeance:
    """Tests pour l'endpoint de suppression d'enseignant d'une séance"""
    
    def test_supprimer_enseignant_success(self, db_session, sample_enseignant, sample_examens):
        """Test de suppression réussie d'un enseignant d'une séance"""
        # D'abord ajouter l'enseignant
        client.post(
            "/planning/ajouter-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1",
                "est_responsable": False
            }
        )
        
        # Puis le supprimer
        response = client.delete(
            "/planning/supprimer-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["nb_affectations_modifiees"] == 5
        assert "supprimé" in data["message"]
        
        # Vérifier que les affectations ont été supprimées
        affectations = db_session.query(Affectation).filter(
            Affectation.enseignant_id == sample_enseignant.id
        ).all()
        assert len(affectations) == 0
    
    def test_supprimer_enseignant_inexistant(self):
        """Test de suppression d'un enseignant inexistant"""
        response = client.delete(
            "/planning/supprimer-enseignant-seance",
            json={
                "enseignant_id": 99999,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1"
            }
        )
        
        assert response.status_code == 404
        assert "introuvable" in response.json()["detail"]
    
    def test_supprimer_seance_inexistante(self, db_session, sample_enseignant):
        """Test de suppression d'une séance inexistante"""
        response = client.delete(
            "/planning/supprimer-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-12-31",
                "h_debut": "23:00:00",
                "h_fin": "23:59:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1"
            }
        )
        
        assert response.status_code == 404
        assert "Aucun examen trouvé" in response.json()["detail"]
    
    def test_supprimer_enseignant_non_affecte(self, db_session, sample_enseignant, sample_examens):
        """Test de suppression d'un enseignant non affecté"""
        response = client.delete(
            "/planning/supprimer-enseignant-seance",
            json={
                "enseignant_id": sample_enseignant.id,
                "date_examen": "2024-01-15",
                "h_debut": "08:30:00",
                "h_fin": "10:30:00",
                "session": "Principale",
                "semestre": "SEMESTRE 1"
            }
        )
        
        assert response.status_code == 404
        assert "n'est pas affecté" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
