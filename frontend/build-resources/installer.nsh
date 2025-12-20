; Script NSIS personnalisé pour l'installeur
; Ce script nettoie les données lors de l'installation

!macro customInstall
  ; Nettoyer les données immédiatement lors de l'installation
  DetailPrint "=== Début du nettoyage des données ==="
  DetailPrint "Chemin cible: $APPDATA\GestionSurveillancesISI"
  
  ; Vérifier si le dossier existe
  ${If} ${FileExists} "$APPDATA\GestionSurveillancesISI\*.*"
    DetailPrint "Dossier détecté, suppression en cours..."
    
    ; Méthode 1: Utiliser RMDir avec force
    RMDir /r /REBOOTOK "$APPDATA\GestionSurveillancesISI"
    
    ; Méthode 2 (fallback): Utiliser cmd.exe pour forcer la suppression
    nsExec::ExecToLog 'cmd.exe /c "rmdir /s /q "$APPDATA\GestionSurveillancesISI" 2>nul"'
    
    ; Attendre un peu pour s'assurer que la suppression est complète
    Sleep 500
    
    DetailPrint "Suppression terminée"
  ${Else}
    DetailPrint "Aucune donnée existante à nettoyer"
  ${EndIf}
  
  ; Recréer la structure de dossiers vide
  DetailPrint "Création de la nouvelle structure..."
  CreateDirectory "$APPDATA\GestionSurveillancesISI"
  CreateDirectory "$APPDATA\GestionSurveillancesISI\database"
  CreateDirectory "$APPDATA\GestionSurveillancesISI\uploads"
  CreateDirectory "$APPDATA\GestionSurveillancesISI\exports"
  
  DetailPrint "=== Nettoyage terminé avec succès ==="
!macroend

!macro customUnInstall
  ; Supprimer les données lors de la désinstallation
  DetailPrint "=== Suppression des données ==="
  DetailPrint "Chemin: $APPDATA\GestionSurveillancesISI"
  
  ${If} ${FileExists} "$APPDATA\GestionSurveillancesISI\*.*"
    DetailPrint "Suppression du dossier de données..."
    
    ; Supprimer complètement le dossier
    RMDir /r /REBOOTOK "$APPDATA\GestionSurveillancesISI"
    
    ; Méthode alternative avec cmd
    nsExec::ExecToLog 'cmd.exe /c "rmdir /s /q "$APPDATA\GestionSurveillancesISI" 2>nul"'
    
    DetailPrint "Données supprimées avec succès"
  ${Else}
    DetailPrint "Aucune donnée à supprimer"
  ${EndIf}
  
  DetailPrint "=== Désinstallation terminée ==="
!macroend
