"""
Script to add the missing abrv_ens column to the enseignants table
"""

import sqlite3
import os

# Database path
db_path = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "database", "surveillance.db"
)

print(f"Database path: {db_path}")
print(f"Database exists: {os.path.exists(db_path)}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check existing columns
cursor.execute("PRAGMA table_info(enseignants)")
columns = cursor.fetchall()
print("\n📋 Current columns in enseignants table:")
for col in columns:
    print(f"  - {col[1]} ({col[2]})")

# Check if abrv_ens already exists
column_names = [col[1] for col in columns]
if "abrv_ens" in column_names:
    print("\n✅ Column 'abrv_ens' already exists!")
else:
    print("\n🔧 Adding 'abrv_ens' column...")
    try:
        cursor.execute("ALTER TABLE enseignants ADD COLUMN abrv_ens VARCHAR(50)")
        conn.commit()
        print("✅ Column 'abrv_ens' added successfully!")

        # Verify
        cursor.execute("PRAGMA table_info(enseignants)")
        columns = cursor.fetchall()
        print("\n📋 Updated columns in enseignants table:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        conn.rollback()

conn.close()
print("\n✅ Done!")
