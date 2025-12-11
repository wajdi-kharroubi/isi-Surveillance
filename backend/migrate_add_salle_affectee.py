"""
Script de migration pour ajouter la colonne salle_affectee à la table presences
"""
import sqlite3
import os

# Chemin de la base de données
DB_PATH = r"C:\Users\wajdi\Desktop\Projet isi\projet\isi-Surveillance\database\surveillance.db"

def migrate():
    """Ajoute la colonne salle_affectee à la table presences si elle n'existe pas"""
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Erreur: Base de données introuvable à {DB_PATH}")
        return False
    
    try:
        # Connexion à la base de données
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print("🔍 Vérification de la structure de la table presences...")
        
        # Vérifier si la colonne existe déjà
        cursor.execute("PRAGMA table_info(presences)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if "salle_affectee" in column_names:
            print("✅ La colonne 'salle_affectee' existe déjà dans la table presences")
            conn.close()
            return True
        
        print("📝 Ajout de la colonne 'salle_affectee' à la table presences...")
        
        # Ajouter la colonne
        cursor.execute("""
            ALTER TABLE presences 
            ADD COLUMN salle_affectee VARCHAR(50)
        """)
        
        conn.commit()
        
        print("✅ Migration réussie!")
        print("   - Colonne 'salle_affectee' ajoutée à la table presences")
        
        # Vérification
        cursor.execute("PRAGMA table_info(presences)")
        columns = cursor.fetchall()
        print("\n📋 Structure actuelle de la table presences:")
        for col in columns:
            print(f"   - {col[1]}: {col[2]}")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Erreur lors de la migration: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Ajout de la colonne salle_affectee")
    print("=" * 60)
    print()
    
    success = migrate()
    
    print()
    print("=" * 60)
    if success:
        print("✅ Migration terminée avec succès!")
    else:
        print("❌ La migration a échoué")
    print("=" * 60)
