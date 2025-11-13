#!/usr/bin/env python3
"""
Script to dump Supabase database schema using psycopg2
"""
import subprocess
import sys
import os

# Install psycopg2 if not already installed
try:
    import psycopg2
except ImportError:
    print("Installing psycopg2...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

# Your Supabase credentials
SUPABASE_URL = "https://fssjoadpvqtmgwhjdiab.supabase.co"
DB_HOST = "fssjoadpvqtmgwhjdiab.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"

# Prompt for password
password = input("Enter your Supabase database password: ")

# Try to connect and dump schema
try:
    connection = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=password,
        sslmode='require'
    )
    print("✓ Connected to remote database")
    
    cursor = connection.cursor()
    
    # Get all schemas
    cursor.execute("""
        SELECT schema_name FROM information_schema.schemata 
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
        ORDER BY schema_name
    """)
    
    schemas = [row[0] for row in cursor.fetchall()]
    print(f"Found schemas: {', '.join(schemas)}")
    
    cursor.close()
    connection.close()
    
    # Now use pg_dump via subprocess
    print("\nAttempting to dump schema using pg_dump via psql...")
    
    connection_string = f"postgresql://{DB_USER}:{password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # Try to dump using environment variable
    os.environ['PGPASSWORD'] = password
    
    # Dump public schema
    try:
        result = subprocess.run(
            [
                "psql",
                f"--host={DB_HOST}",
                f"--port={DB_PORT}",
                f"--username={DB_USER}",
                f"--dbname={DB_NAME}",
                "--command=\\df",
            ],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✓ psql connection successful!")
        else:
            print(f"✗ psql error: {result.stderr}")
            
    except FileNotFoundError:
        print("✗ psql not found. Trying alternative method...")
        print("\nTo fix the version mismatch, use the Supabase Dashboard to download the schema:")
        print("1. Go to: https://app.supabase.com/project/fssjoadpvqtmgwhjdiab/database/backups")
        print("2. Or use the SQL Editor to view schema")
    
except psycopg2.OperationalError as e:
    print(f"✗ Connection failed: {e}")
    print("\nAlternative methods:")
    print("1. Use Supabase Dashboard SQL Editor")
    print("2. Download schema from backups section")
    print("3. Use the command: supabase db pull")

except Exception as e:
    print(f"✗ Error: {e}")
