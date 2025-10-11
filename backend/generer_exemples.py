#!/usr/bin/env python3
"""
Script pour générer des fichiers Excel d'exemple pour l'import.
"""

import pandas as pd
from pathlib import Path

# Créer le dossier exemples s'il n'existe pas
exemples_dir = Path(__file__).parent / "exemples"
exemples_dir.mkdir(exist_ok=True)

print("🚀 Génération des fichiers Excel d'exemple...")

# ========== FICHIER ENSEIGNANTS ==========
print("\n1️⃣  Création de enseignants_exemple.xlsx...")

enseignants_data = {
    'nom_ens': [
        'DUPONT', 
        'MARTIN', 
        'BERNARD', 
        'DUBOIS', 
        'LAURENT',
        'PETIT',
        'ROBERT',
        'RICHARD'
    ],
    'prenom_ens': [
        'Jean', 
        'Marie', 
        'Paul', 
        'Sophie', 
        'Pierre',
        'Lucie',
        'Thomas',
        'Claire'
    ],
    'email_ens': [
        'jean.dupont@univ.tn',
        'marie.martin@univ.tn',
        'paul.bernard@univ.tn',
        'sophie.dubois@univ.tn',
        'pierre.laurent@univ.tn',
        'lucie.petit@univ.tn',
        'thomas.robert@univ.tn',
        'claire.richard@univ.tn'
    ],
    'grade_code_ens': [
        'PES',  # Professeur de l'Enseignement Supérieur
        'PR',   # Professeur
        'MC',   # Maître de Conférences
        'MA',   # Maître Assistant
        'AC',   # Assistant Contractuel
        'AS',   # Assistant
        'PTC',  # Personnel Technique et Contractuel
        'VA'    # Vacataire
    ],
    'code_smartex_ens': [
        7,
        23,
        45,
        156,
        89,
        12,
        201,
        9
    ],
    'participe_surveillance': [
        'vrai',
        'vrai',
        'vrai',
        'vrai',
        'faux',  # Pierre ne participe pas
        'vrai',
        'vrai',
        'vrai'
    ]
}

df_enseignants = pd.DataFrame(enseignants_data)
fichier_ens = exemples_dir / "enseignants_exemple.xlsx"
df_enseignants.to_excel(fichier_ens, index=False)
print(f"   ✅ {len(enseignants_data['nom_ens'])} enseignants → {fichier_ens}")

# ========== FICHIER VOEUX ==========
print("\n2️⃣  Création de voeux_exemple.xlsx...")

voeux_data = {
    'semestre_code.libelle': [
        'Semestre 1', 'Semestre 1',     # Jean - Semestre 1
        'Semestre 2',                    # Marie - Semestre 2
        'Semestre 1', 'Semestre 1', 'Semestre 2',  # Paul
        'Semestre 2',                    # Sophie
        'Semestre 1', 'Semestre 2'      # Lucie
    ],
    'session.libelle': [
        'Partiel', 'Partiel',
        'Partiel',
        'Partiel', 'Partiel', 'Partiel',
        'Partiel',
        'Partiel', 'Partiel'
    ],
    'enseignant_uuid.nom_ens': [
        'DUPONT', 'DUPONT',
        'MARTIN',
        'BERNARD', 'BERNARD', 'BERNARD',
        'DUBOIS',
        'PETIT', 'PETIT'
    ],
    'enseignant_uuid.prenom_ens': [
        'Jean', 'Jean',
        'Marie',
        'Paul', 'Paul', 'Paul',
        'Sophie',
        'Lucie', 'Lucie'
    ],
    'jour': [
        1, 2,        # Jean - jours 1 et 2
        1,           # Marie - jour 1
        3, 4, 5,     # Paul - jours 3, 4, 5
        6,           # Sophie - jour 6
        2, 3         # Lucie - jours 2 et 3
    ],
    'seance': [
        'S1', 'S3',  # Jean - S1 (8:30-10:00), S3 (12:30-14:00)
        'S2',        # Marie - S2 (10:30-12:00)
        'S4', 'S1', 'S2',  # Paul - S4, S1, S2
        'S3',        # Sophie - S3
        'S1', 'S4'   # Lucie - S1, S4
    ]
}

df_voeux = pd.DataFrame(voeux_data)
fichier_voeux = exemples_dir / "voeux_exemple.xlsx"
df_voeux.to_excel(fichier_voeux, index=False)
print(f"   ✅ {len(voeux_data['semestre_code.libelle'])} vœux → {fichier_voeux}")

# ========== FICHIER EXAMENS ==========
print("\n3️⃣  Création de examens_exemple.xlsx...")

examens_data = {
    'dateExam': [
        '15/06/2025', '15/06/2025', '15/06/2025', '15/06/2025',
        '16/06/2025', '16/06/2025', '16/06/2025',
        '17/06/2025', '17/06/2025', '17/06/2025',
        '18/06/2025', '18/06/2025',
        '19/06/2025', '19/06/2025', '19/06/2025',
        '20/06/2025', '20/06/2025'
    ],
    'h_debut': [
        '15/06/2025 08:30:00', '15/06/2025 08:30:00', '15/06/2025 11:00:00', '15/06/2025 14:00:00',
        '16/06/2025 08:30:00', '16/06/2025 08:30:00', '16/06/2025 14:00:00',
        '17/06/2025 08:30:00', '17/06/2025 11:00:00', '17/06/2025 14:00:00',
        '18/06/2025 08:30:00', '18/06/2025 14:00:00',
        '19/06/2025 08:30:00', '19/06/2025 08:30:00', '19/06/2025 14:00:00',
        '20/06/2025 08:30:00', '20/06/2025 14:00:00'
    ],
    'h_fin': [
        '15/06/2025 10:30:00', '15/06/2025 10:30:00', '15/06/2025 13:00:00', '15/06/2025 16:00:00',
        '16/06/2025 10:30:00', '16/06/2025 10:30:00', '16/06/2025 16:00:00',
        '17/06/2025 10:30:00', '17/06/2025 13:00:00', '17/06/2025 16:00:00',
        '18/06/2025 10:30:00', '18/06/2025 16:00:00',
        '19/06/2025 10:30:00', '19/06/2025 10:30:00', '19/06/2025 16:00:00',
        '20/06/2025 10:30:00', '20/06/2025 16:00:00'
    ],
    'session': [
        'P', 'P', 'P', 'C',
        'P', 'P', 'C',
        'P', 'P', 'C',
        'P', 'C',
        'P', 'P', 'C',
        'P', 'C'
    ],
    'type ex': [
        'Écrit', 'Écrit', 'Écrit', 'TP',
        'Écrit', 'Écrit', 'TP',
        'Écrit', 'Écrit', 'TP',
        'Écrit', 'Oral',
        'Écrit', 'Écrit', 'TP',
        'Écrit', 'Oral'
    ],
    'semestre': [
        'SEMESTRE 2', 'SEMESTRE 2', 'SEMESTRE 1', 'SEMESTRE 2',
        'SEMESTRE 1', 'SEMESTRE 2', 'SEMESTRE 2',
        'SEMESTRE 2', 'SEMESTRE 1', 'SEMESTRE 2',
        'SEMESTRE 1', 'SEMESTRE 2',
        'SEMESTRE 2', 'SEMESTRE 1', 'SEMESTRE 2',
        'SEMESTRE 1', 'SEMESTRE 2'
    ],
    'enseignant': [
        7, 23, 45, 156,
        7, 23, 156,
        45, 12, 201,
        7, 23,
        45, 156, 12,
        201, 9
    ],
    'cod_salle': [
        'A101', 'A102', 'B201', 'LAB01',
        'A101', 'A102', 'LAB02',
        'B201', 'B202', 'LAB01',
        'C301', 'D101',
        'A101', 'B201', 'LAB03',
        'C301', 'D102'
    ]
}

df_examens = pd.DataFrame(examens_data)
fichier_examens = exemples_dir / "examens_exemple.xlsx"
df_examens.to_excel(fichier_examens, index=False)
print(f"   ✅ {len(examens_data['dateExam'])} examens → {fichier_examens}")

# ========== RÉSUMÉ ==========
print("\n" + "="*60)
print("✅ FICHIERS D'EXEMPLE CRÉÉS AVEC SUCCÈS!")
print("="*60)
print(f"\n📂 Emplacement: {exemples_dir.absolute()}\n")
print("📊 Statistiques:")
print(f"   • {len(enseignants_data['nom_ens'])} enseignants")
print(f"   • {len(voeux_data['semestre_code.libelle'])} vœux de non-surveillance")
print(f"   • {len(examens_data['dateExam'])} examens")
print(f"\n📅 Période: 15-20 Juin 2025")
print(f"🏛️  Salles: {len(set(examens_data['cod_salle']))} salles différentes")
print(f"📝 Sessions: Principale (P) et Contrôle (C)")
print(f"⏰ Séances: S1 (8:30-10:00), S2 (10:30-12:00), S3 (12:30-14:00), S4 (14:30-16:00)")

print("\n🎯 UTILISATION:")
print("   1. Allez sur http://localhost:5173/enseignants")
print("   2. Cliquez 'Importer depuis Excel'")
print("   3. Sélectionnez enseignants_exemple.xlsx")
print("   4. Répétez pour voeux_exemple.xlsx et examens_exemple.xlsx")
print("   5. Générez le planning!")

print("\n💡 NOTE:")
print("   Ces fichiers sont des exemples. Vous pouvez les modifier")
print("   dans Excel avant de les importer.")
print("\n")
