# -*- mode: python ; coding: utf-8 -*-
"""
Fichier spec pour PyInstaller - Backend FastAPI
"""

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Inclure les fichiers de configuration et templates si nécessaire
        ('*.py', '.'),
        ('api/*.py', 'api'),
        ('models/*.py', 'models'),
        ('services/*.py', 'services'),
        ('algorithms/*.py', 'algorithms'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'sqlalchemy',
        'sqlalchemy.ext.declarative',
        'pydantic',
        'ortools',
        'ortools.linear_solver',
        'ortools.linear_solver.pywraplp',
        'openpyxl',
        'pandas',
        'xlsxwriter',
        'reportlab',
        'docx',
        'numpy',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'tkinter',
        'test',
        'unittest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='main',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Mettre False pour cacher la console en production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='logo/logoISI.png',
)
