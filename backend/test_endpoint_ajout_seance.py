"""
Test de l'endpoint ajouter-enseignant-par-date-heure
"""
import requests
import json
from datetime import date, time

BASE_URL = "http://localhost:8000/api"

def test_ajouter_enseignant_par_date_heure():
    """
    Test de l'ajout d'un enseignant à une séance par date et heure
    """
    url = f"{BASE_URL}/planning/ajouter-enseignant-par-date-heure"
    
    # Données de test
    data = {
        "enseignant_id": 1,
        "date_examen": "2024-06-15",  # Ajustez selon vos données
        "h_debut": "08:30:00"
    }
    
    print("🔄 Test de l'endpoint ajouter-enseignant-par-date-heure")
    print(f"📤 Envoi de la requête: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ SUCCÈS!")
            print(f"📝 Message: {result['message']}")
            print(f"📊 Affectations créées: {result['nb_affectations_modifiees']}")
            print(f"⭐ Responsable: {'Oui' if result.get('est_responsable') else 'Non'}")
            return True
        else:
            print(f"\n❌ ERREUR {response.status_code}")
            print(f"📝 Détail: {response.json().get('detail', 'Erreur inconnue')}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Erreur de connexion")
        print("⚠️ Assurez-vous que le serveur backend est démarré (python main.py)")
        return False
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {str(e)}")
        return False

def test_cas_erreur_enseignant_inexistant():
    """
    Test avec un enseignant qui n'existe pas
    """
    url = f"{BASE_URL}/planning/ajouter-enseignant-par-date-heure"
    
    data = {
        "enseignant_id": 99999,  # ID inexistant
        "date_examen": "2024-06-15",
        "h_debut": "08:30:00"
    }
    
    print("\n🔄 Test: Enseignant inexistant")
    
    try:
        response = requests.post(url, json=data)
        
        if response.status_code == 404:
            print("✅ SUCCÈS: Erreur 404 correctement retournée")
            print(f"📝 Message: {response.json().get('detail')}")
            return True
        else:
            print(f"❌ ERREUR: Code attendu 404, reçu {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return False

def test_cas_erreur_seance_inexistante():
    """
    Test avec une séance qui n'existe pas
    """
    url = f"{BASE_URL}/planning/ajouter-enseignant-par-date-heure"
    
    data = {
        "enseignant_id": 1,
        "date_examen": "2099-12-31",  # Date future
        "h_debut": "23:59:00"
    }
    
    print("\n🔄 Test: Séance inexistante")
    
    try:
        response = requests.post(url, json=data)
        
        if response.status_code == 404:
            print("✅ SUCCÈS: Erreur 404 correctement retournée")
            print(f"📝 Message: {response.json().get('detail')}")
            return True
        else:
            print(f"❌ ERREUR: Code attendu 404, reçu {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TESTS DE L'ENDPOINT ajouter-enseignant-par-date-heure")
    print("=" * 60)
    
    # Test principal
    test_ajouter_enseignant_par_date_heure()
    
    # Tests d'erreur
    test_cas_erreur_enseignant_inexistant()
    test_cas_erreur_seance_inexistante()
    
    print("\n" + "=" * 60)
    print("✅ Tests terminés")
    print("=" * 60)
