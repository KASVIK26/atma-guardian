#!/usr/bin/env python3
"""
Comprehensive schema dump from Supabase including RLS policies, triggers, and constraints
"""
import subprocess
import sys
import os
import json
from datetime import datetime

# Your Supabase credentials
DB_HOST = "fssjoadpvqtmgwhjdiab.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"

def get_password():
    """Get database password from user or environment"""
    if 'PGPASSWORD' in os.environ:
        return os.environ['PGPASSWORD']
    return input("Enter your Supabase database password: ")

def run_psql_query(password, query):
    """Run a psql query and return the output"""
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
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return "", str(e), 1

def main():
    password = get_password()
    
    # Test connection
    print("Testing connection...")
    stdout, stderr, rc = run_psql_query(password, "SELECT version();")
    
    if rc != 0:
        print(f"❌ Connection failed: {stderr}")
        sys.exit(1)
    
    print("✓ Connected successfully!")
    print()
    
    # Create output file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"schema_dump_{timestamp}.sql"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- =============================================\n")
        f.write("-- COMPREHENSIVE SUPABASE SCHEMA DUMP\n")
        f.write(f"-- Generated: {datetime.now().isoformat()}\n")
        f.write("-- =============================================\n\n")
        
        # 1. Get all tables
        print("1. Extracting table definitions...")
        stdout, _, _ = run_psql_query(password, """
            SELECT string_agg(schemaname || '.' || tablename, ', ')
            FROM pg_tables WHERE schemaname = 'public';
        """)
        tables = [t.strip() for t in stdout.split('\n') if t.strip() and 'public.' in t]
        
        if tables:
            f.write("\n-- =============================================\n")
            f.write("-- SECTION 1: TABLE DEFINITIONS\n")
            f.write("-- =============================================\n\n")
            for table in tables:
                table_name = table.split('.')[-1]
                print(f"   - Dumping table: {table_name}")
                os.environ['PGPASSWORD'] = password
                result = subprocess.run(
                    [
                        "pg_dump",
                        f"--host={DB_HOST}",
                        f"--port={DB_PORT}",
                        f"--username={DB_USER}",
                        f"--dbname={DB_NAME}",
                        "--schema-only",
                        f"--table={table_name}",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                if result.returncode == 0:
                    f.write(result.stdout)
                    f.write("\n")
        
        # 2. Get all RLS policies
        print("2. Extracting RLS policies...")
        stdout, _, _ = run_psql_query(password, """
            SELECT schemaname, tablename FROM pg_tables 
            WHERE schemaname = 'public' AND rowsecurity = true;
        """)
        
        f.write("\n-- =============================================\n")
        f.write("-- SECTION 2: RLS POLICIES\n")
        f.write("-- =============================================\n\n")
        
        for line in stdout.strip().split('\n')[2:]:  # Skip header
            if '|' in line:
                parts = line.split('|')
                if len(parts) >= 2:
                    table_name = parts[1].strip()
                    if table_name:
                        print(f"   - Checking policies for table: {table_name}")
                        # Get policies for this table
                        policy_query = f"""
                            SELECT 
                              tablename,
                              policyname,
                              permissive,
                              roles,
                              qual,
                              with_check,
                              cmd
                            FROM pg_policies 
                            WHERE tablename = '{table_name}'
                            ORDER BY policyname;
                        """
                        policy_stdout, _, _ = run_psql_query(password, policy_query)
                        f.write(f"\n-- Policies for table: {table_name}\n")
                        f.write(policy_stdout)
        
        # 3. Get all triggers and functions
        print("3. Extracting triggers and functions...")
        f.write("\n-- =============================================\n")
        f.write("-- SECTION 3: TRIGGERS AND FUNCTIONS\n")
        f.write("-- =============================================\n\n")
        
        os.environ['PGPASSWORD'] = password
        result = subprocess.run(
            [
                "pg_dump",
                f"--host={DB_HOST}",
                f"--port={DB_PORT}",
                f"--username={DB_USER}",
                f"--dbname={DB_NAME}",
                "--schema-only",
                "--section=post-data",
            ],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            # Extract only function and trigger definitions
            lines = result.stdout.split('\n')
            in_function = False
            for line in lines:
                if 'CREATE FUNCTION' in line or 'CREATE TRIGGER' in line:
                    in_function = True
                if in_function:
                    f.write(line + '\n')
        
        # 4. Get all constraints
        print("4. Extracting constraints...")
        f.write("\n-- =============================================\n")
        f.write("-- SECTION 4: CONSTRAINTS\n")
        f.write("-- =============================================\n\n")
        
        constraints_query = """
            SELECT 
              tc.table_name,
              kcu.column_name,
              tc.constraint_type,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name,
              rc.delete_rule,
              rc.update_rule
            FROM information_schema.table_constraints AS tc
            LEFT JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            LEFT JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public'
            ORDER BY tc.table_name, tc.constraint_name;
        """
        constraints_stdout, _, _ = run_psql_query(password, constraints_query)
        f.write(constraints_stdout)
        
        # 5. Summary statistics
        print("5. Generating summary...")
        f.write("\n-- =============================================\n")
        f.write("-- SECTION 5: SUMMARY STATISTICS\n")
        f.write("-- =============================================\n\n")
        
        # Table count
        tables_query = "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
        tables_count, _, _ = run_psql_query(password, tables_query)
        f.write(f"-- {tables_count}")
        
        # RLS enabled tables
        rls_query = "SELECT COUNT(*) as rls_tables FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"
        rls_tables, _, _ = run_psql_query(password, rls_query)
        f.write(f"-- Tables with RLS enabled:\n-- {rls_tables}")
        
        # Policy count
        policies_query = "SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';"
        policies_count, _, _ = run_psql_query(password, policies_query)
        f.write(f"-- Total RLS policies:\n-- {policies_count}")
        
        # Trigger count
        triggers_query = "SELECT COUNT(*) as trigger_count FROM information_schema.triggers WHERE trigger_schema = 'public';"
        triggers_count, _, _ = run_psql_query(password, triggers_query)
        f.write(f"-- Total triggers:\n-- {triggers_count}")
    
    print(f"\n✓ Schema dump saved to: {output_file}")
    print(f"\nSummary:")
    print(f"  - Output file: {output_file}")
    print(f"\nNext steps:")
    print(f"  1. Review the schema dump")
    print(f"  2. Analyze RLS policies for conflicts")
    print(f"  3. Check foreign key constraints")
    print(f"  4. Review trigger functions")

if __name__ == "__main__":
    main()
