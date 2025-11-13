#!/usr/bin/env python3
"""
Complete schema dump from Supabase with full details on RLS, triggers, and constraints
This will be used for comprehensive analysis before creating the fix
"""

import subprocess
import sys
import os
import json
from datetime import datetime

DB_HOST = "fssjoadpvqtmgwhjdiab.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"

def get_password():
    """Get database password"""
    if 'PGPASSWORD' in os.environ:
        return os.environ['PGPASSWORD']
    password = input("\n🔐 Enter Supabase database password: ")
    return password

def run_psql_query(password, query, output_file=None):
    """Run a psql query and optionally write to file"""
    os.environ['PGPASSWORD'] = password
    try:
        result = subprocess.run(
            [
                "psql",
                f"--host={DB_HOST}",
                f"--port={DB_PORT}",
                f"--username={DB_USER}",
                f"--dbname={DB_NAME}",
                f"--command={query}"
            ],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        output = result.stdout
        if result.returncode != 0:
            print(f"❌ Query failed: {result.stderr}")
            return None
        
        if output_file:
            with open(output_file, 'a', encoding='utf-8') as f:
                f.write(output)
        
        return output
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("=" * 80)
    print("COMPLETE SCHEMA DUMP AND ANALYSIS")
    print("=" * 80)
    
    password = get_password()
    
    # Test connection
    print("\n🔄 Testing connection...")
    result = subprocess.run(
        [
            "psql",
            f"--host={DB_HOST}",
            f"--port={DB_PORT}",
            f"--username={DB_USER}",
            f"--dbname={DB_NAME}",
            "--command=SELECT version();"
        ],
        capture_output=True,
        text=True,
        timeout=10,
        env={**os.environ, 'PGPASSWORD': password}
    )
    
    if result.returncode != 0:
        print(f"❌ Connection failed!")
        print(result.stderr)
        sys.exit(1)
    
    print("✅ Connected to database!")
    
    # Create output files
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_file = f"schema_dump_complete_{timestamp}.sql"
    analysis_file = f"schema_analysis_{timestamp}.txt"
    
    print(f"\n📁 Output files:")
    print(f"   - {dump_file}")
    print(f"   - {analysis_file}")
    
    # Clear files
    open(dump_file, 'w').close()
    open(analysis_file, 'w').close()
    
    # Start dump
    with open(dump_file, 'w', encoding='utf-8') as f:
        f.write("-- =============================================\n")
        f.write("-- COMPLETE SCHEMA DUMP\n")
        f.write(f"-- Generated: {datetime.now().isoformat()}\n")
        f.write("-- =============================================\n\n")
    
    with open(analysis_file, 'w', encoding='utf-8') as f:
        f.write("SCHEMA ANALYSIS REPORT\n")
        f.write("=" * 80 + "\n")
        f.write(f"Generated: {datetime.now().isoformat()}\n\n")
    
    # 1. Get all tables
    print("\n📋 1. EXTRACTING TABLES...")
    query = """
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
    """
    result = run_psql_query(password, query)
    
    if result:
        tables = [line.strip() for line in result.split('\n') if line.strip() and line.strip() != 'table_name' and '---' not in line and '(' not in line]
        print(f"   ✓ Found {len(tables)} tables")
        
        for table in tables:
            print(f"      - {table}")
    
    # 2. Get RLS status for all tables
    print("\n🔒 2. CHECKING RLS STATUS...")
    query = """
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
    """
    rls_result = run_psql_query(password, query)
    print(rls_result)
    
    with open(analysis_file, 'a', encoding='utf-8') as f:
        f.write("\nRLS STATUS:\n")
        f.write(rls_result + "\n")
    
    # 3. Get all RLS policies
    print("\n📋 3. EXTRACTING RLS POLICIES...")
    query = """
    SELECT 
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
    """
    policies_result = run_psql_query(password, query)
    
    if policies_result:
        policy_lines = policies_result.split('\n')
        policy_count = len([l for l in policy_lines if l.strip() and '|' in l])
        print(f"   ✓ Found {policy_count} policies")
    
    with open(analysis_file, 'a', encoding='utf-8') as f:
        f.write("\n\nALL RLS POLICIES:\n")
        f.write("=" * 80 + "\n")
        f.write(policies_result + "\n")
    
    # 4. Get table structures
    print("\n📋 4. EXTRACTING TABLE STRUCTURES...")
    os.environ['PGPASSWORD'] = password
    result = subprocess.run(
        [
            "pg_dump",
            f"--host={DB_HOST}",
            f"--port={DB_PORT}",
            f"--username={DB_USER}",
            f"--dbname={DB_NAME}",
            "--schema-only",
            "--schema=public"
        ],
        capture_output=True,
        text=True,
        timeout=60
    )
    
    if result.returncode == 0:
        with open(dump_file, 'a', encoding='utf-8') as f:
            f.write("\n-- =============================================\n")
            f.write("-- TABLE DEFINITIONS\n")
            f.write("-- =============================================\n\n")
            f.write(result.stdout)
        print("   ✓ Table structures extracted")
    
    # 5. Get all triggers
    print("\n⚡ 5. EXTRACTING TRIGGERS...")
    query = """
    SELECT
        trigger_name,
        event_object_table,
        event_manipulation,
        action_timing,
        action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
    """
    triggers_result = run_psql_query(password, query)
    
    with open(analysis_file, 'a', encoding='utf-8') as f:
        f.write("\n\nALL TRIGGERS:\n")
        f.write("=" * 80 + "\n")
        f.write(triggers_result + "\n")
    
    if triggers_result:
        trigger_lines = triggers_result.split('\n')
        trigger_count = len([l for l in trigger_lines if l.strip() and '|' in l])
        print(f"   ✓ Found {trigger_count} triggers")
    
    # 6. Get all foreign keys
    print("\n🔗 6. EXTRACTING FOREIGN KEYS...")
    query = """
    SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name as referenced_table,
        ccu.column_name as referenced_column,
        rc.delete_rule,
        rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints rc 
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
    """
    fk_result = run_psql_query(password, query)
    
    with open(analysis_file, 'a', encoding='utf-8') as f:
        f.write("\n\nALL FOREIGN KEYS:\n")
        f.write("=" * 80 + "\n")
        f.write(fk_result + "\n")
    
    if fk_result:
        fk_lines = fk_result.split('\n')
        fk_count = len([l for l in fk_lines if l.strip() and '|' in l])
        print(f"   ✓ Found {fk_count} foreign keys")
    
    # 7. Get all functions
    print("\n⚙️  7. EXTRACTING FUNCTIONS...")
    query = """
    SELECT
        routine_name,
        routine_type,
        routine_definition
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
    """
    functions_result = run_psql_query(password, query)
    
    with open(analysis_file, 'a', encoding='utf-8') as f:
        f.write("\n\nALL FUNCTIONS:\n")
        f.write("=" * 80 + "\n")
        f.write(functions_result + "\n")
    
    if functions_result:
        function_lines = functions_result.split('\n')
        function_count = len([l for l in function_lines if l.strip() and l.strip().startswith('|')])
        print(f"   ✓ Found {function_count} functions")
    
    # 8. Row counts for each table
    print("\n📊 8. TABLE ROW COUNTS...")
    query = """
    SELECT
        schemaname,
        tablename,
        n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC;
    """
    rowcount_result = run_psql_query(password, query)
    
    with open(analysis_file, 'a', encoding='utf-8') as f:
        f.write("\n\nTABLE ROW COUNTS:\n")
        f.write("=" * 80 + "\n")
        f.write(rowcount_result + "\n")
    
    print(rowcount_result)
    
    # 9. Column details for each table
    print("\n📐 9. EXTRACTING COLUMN DETAILS...")
    query = """
    SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
    """
    columns_result = run_psql_query(password, query)
    
    with open(analysis_file, 'a', encoding='utf-8') as f:
        f.write("\n\nALL COLUMNS (BY TABLE):\n")
        f.write("=" * 80 + "\n")
        f.write(columns_result + "\n")
    
    print("   ✓ Column details extracted")
    
    print("\n" + "=" * 80)
    print("✅ DUMP COMPLETE!")
    print("=" * 80)
    print(f"\n📁 Files created:")
    print(f"   1. {dump_file}")
    print(f"      - Full schema with table definitions")
    print(f"   2. {analysis_file}")
    print(f"      - Detailed analysis of RLS, triggers, FKs, etc.")
    print("\n📖 Next steps:")
    print("   1. Review analysis file to understand current state")
    print("   2. Ask questions about table-by-table requirements")
    print("   3. Create comprehensive fix file with all policies")

if __name__ == "__main__":
    main()
