"""
Script pour convertir le logo PNG en fichier ICO pour Windows
"""
from PIL import Image
import os
import sys

# Chemins
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
logo_path = os.path.join(project_root, "backend", "logo", "logoISI.png")
output_ico = os.path.join(project_root, "frontend", "public", "icon.ico")
output_png = os.path.join(project_root, "frontend", "public", "icon.png")

print("Conversion du logo en icone Windows...")

try:
    # Creer le dossier public s'il n'existe pas
    public_dir = os.path.dirname(output_ico)
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
        print(f"Dossier cree: {public_dir}")
    
    # Ouvrir l'image PNG
    if not os.path.exists(logo_path):
        print(f"[ERREUR] Le fichier {logo_path} n'existe pas")
        print("   Assurez-vous que le logo existe dans backend/logo/logoISI.png")
        sys.exit(1)
    
    img = Image.open(logo_path)
    print(f"Logo charge: {logo_path}")
    print(f"Taille originale: {img.size}")
    
    # Convertir en RGBA si necessaire
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
        print("Image convertie en mode RGBA")
    
    # Redimensionner a au moins 512x512 pour avoir une bonne qualite
    # On garde le ratio et on centre sur un fond transparent
    target_size = 512
    
    # Calculer le nouveau ratio
    ratio = min(target_size / img.width, target_size / img.height)
    new_size = (int(img.width * ratio), int(img.height * ratio))
    
    # Redimensionner l'image
    img_resized = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # Creer une nouvelle image 512x512 avec fond transparent
    final_img = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    
    # Centrer l'image redimensionnee
    x = (target_size - new_size[0]) // 2
    y = (target_size - new_size[1]) // 2
    final_img.paste(img_resized, (x, y), img_resized)
    
    print(f"Image redimensionnee et centree: {final_img.size}")
    
    # Sauvegarder une copie PNG dans public
    final_img.save(output_png, format='PNG')
    print(f"[OK] PNG cree: {output_png}")
    
    # Creer l'icone ICO avec plusieurs tailles
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    final_img.save(output_ico, format='ICO', sizes=icon_sizes)
    print(f"[OK] ICO cree: {output_ico}")
    
    print("[SUCCES] Conversion reussie!")
    sys.exit(0)
    
except Exception as e:
    print(f"[ERREUR] Erreur lors de la conversion: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
