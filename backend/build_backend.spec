# -*- mode: python ; coding: utf-8 -*-
"""
Fichier spec pour PyInstaller - Backend FastAPI
Build: pyinstaller build_backend.spec --clean
"""
import sys
import os
from pathlib import Path

block_cipher = None

# Paths
spec_root = Path.cwd()

# Collect OR-Tools binaries (DLLs)
ortools_binaries = []
try:
    import ortools
    ortools_path = Path(ortools.__file__).parent
    
    # Find all DLL files in ortools directories
    for dll_file in ortools_path.rglob('*.dll'):
        # Add DLL to binaries with correct destination
        rel_path = dll_file.relative_to(ortools_path.parent)
        ortools_binaries.append((str(dll_file), str(rel_path.parent)))
    
    print(f"Found {len(ortools_binaries)} OR-Tools DLLs to include")
except Exception as e:
    print(f"Warning: Could not collect OR-Tools binaries: {e}")

a = Analysis(
    ['main.py'],
    pathex=[str(spec_root)],
    binaries=ortools_binaries,
    datas=[
        # Include all Python modules
        ('*.py', '.'),
        ('api/*.py', 'api'),
        ('models/*.py', 'models'),
        ('services/*.py', 'services'),
        ('algorithms/*.py', 'algorithms'),
        ('api/__init__.py', 'api'),
        ('models/__init__.py', 'models'),
        ('services/__init__.py', 'services'),
        ('algorithms/__init__.py', 'algorithms'),
    ],
    hiddenimports=[
        # Uvicorn
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        # FastAPI & Dependencies
        'fastapi',
        'fastapi.routing',
        'starlette',
        'starlette.routing',
        'starlette.middleware',
        'starlette.middleware.cors',
        # SQLAlchemy
        'sqlalchemy',
        'sqlalchemy.ext.declarative',
        'sqlalchemy.orm',
        'sqlalchemy.sql',
        'sqlalchemy.sql.default_comparator',
        # Pydantic
        'pydantic',
        'pydantic.types',
        'pydantic_core',
        'pydantic_settings',
        'email_validator',
        # OR-Tools
        'ortools',
        'ortools.linear_solver',
        'ortools.linear_solver.pywraplp',
        'ortools.sat',
        'ortools.sat.python',
        'ortools.sat.python.cp_model',
        'ortools.sat.python.cp_model_helper',
        'ortools.init',
        'ortools.init.python',
        'ortools.util',
        'ortools.util.python',
        'ortools.util.python.sorted_interval_list',
        # Excel/Data Processing
        'openpyxl',
        'openpyxl.cell',
        'openpyxl.cell.cell',
        'pandas',
        'pandas._libs',
        'pandas._libs.tslibs',
        'xlsxwriter',
        # PDF/Document Generation
        'reportlab',
        'reportlab.pdfgen',
        'reportlab.lib',
        'reportlab.platypus',
        'PyPDF2',
        'docx',
        # Utilities
        'numpy',
        'numpy.core',
        'numpy.core._multiarray_umath',
        'dateutil',
        'dateutil.parser',
        'multipart',
        'aiofiles',
        'httpx',
        'dotenv',
        # Crypto
        'passlib',
        'passlib.handlers',
        'passlib.handlers.bcrypt',
        'bcrypt',
        'jose',
        'jose.jwt',
        'cryptography',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'tkinter',
        'test',
        'unittest',
        'pytest',
        'setuptools',
        'pip',
        'wheel',
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
    name='surveillance_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window in production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
