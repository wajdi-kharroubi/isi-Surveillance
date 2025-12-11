"""
Endpoint pour exporter le nombre de surveillants par salle dans chaque séance
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.models import Examen, Presence
from datetime import datetime
import pandas as pd
import os
from config import EXPORT_DIR
from fastapi.responses import FileResponse

@router.get("/absences/export-salles-excel")
def export_salles_surveillants_excel(
    background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """Exporte le nombre de surveillants par salle pour chaque séance au format Excel."""
    
    # Récupérer tous les examens groupés par séance
    examens = db.query(Examen).all()
    
    # Grouper par séance
    seances = {}
    for ex in examens:
        key = (ex.dateExam, ex.h_debut, ex.h_fin, ex.session, ex.semestre)
        if key not in seances:
            seances[key] = []
        seances[key].append(ex.cod_salle)
    
    # Récupérer toutes les présences
    presences = db.query(Presence).all()
    
    # Créer un dictionnaire pour compter les surveillants par salle
    rows = []
    for (date, h_debut, h_fin, session, semestre), salles in seances.items():
        # Pour chaque salle de la séance
        for salle in salles:
            # Compter les surveillants affectés à cette salle spécifique
            nb_surveillants = sum(
                1 for p in presences 
                if p.date_exam == date 
                and p.h_debut == h_debut 
                and p.h_fin == h_fin 
                and p.session == session 
                and p.semestre == semestre
                and p.salle_affectee == salle
                and p.present == True
            )
            
            rows.append({
                "Date": date.strftime("%d/%m/%Y") if date else "",
                "Heure Début": str(h_debut)[:5] if h_debut else "",
                "Heure Fin": str(h_fin)[:5] if h_fin else "",
                "Session": session or "",
                "Semestre": semestre or "",
                "Salle": salle or "",
                "Nb Surveillants": nb_surveillants,
            })
    
    # Créer le DataFrame
    df = pd.DataFrame(rows)
    
    # Trier par date, heure, puis salle
    df = df.sort_values(["Date", "Heure Début", "Salle"])
    
    # Générer le fichier Excel
    filename = f"surveillants_par_salle_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = os.path.join(EXPORT_DIR, filename)
    
    # Sauvegarder en Excel avec mise en forme
    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Surveillants par Salle", index=False)
        
        # Récupérer la feuille pour la mise en forme
        worksheet = writer.sheets["Surveillants par Salle"]
        
        # Ajuster la largeur des colonnes
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
        
        # Formater l'en-tête
        from openpyxl.styles import Font, PatternFill, Alignment
        
        header_fill = PatternFill(
            start_color="1F4E78", end_color="1F4E78", fill_type="solid"
        )
        header_font = Font(bold=True, color="FFFFFF")
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Ajouter une tâche en arrière-plan pour supprimer le fichier après envoi
    background_tasks.add_task(os.remove, filepath)
    
    # Retourner le fichier
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
