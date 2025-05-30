# ClassBots Database Migrations

This directory contains the complete database schema setup for ClassBots. These migration files should be run in order to set up a new database from scratch.

## Migration Files

### 00001_initial_schema.sql
Creates the core database structure including:
- All tables (profiles, rooms, chatbots, messages, etc.)
- Basic constraints and relationships
- The unified `profiles` view for backward compatibility

### 00002_indexes.sql
Creates all performance indexes for:
- Foreign key relationships
- Common query patterns
- Search operations
- Timestamp-based sorting

### 00003_rls_policies.sql
Implements Row Level Security (RLS) policies for:
- Multi-tenant data isolation
- Role-based access control
- Secure data access patterns

### 00004_functions_triggers.sql
Creates database functions and triggers for:
- Automatic timestamp updates
- User profile creation on signup
- Room code generation
- Token cleanup
- Helper functions for role checking

### 00005_storage_and_updates.sql
Handles post-schema setup and updates:
- Creates Supabase storage bucket for document uploads
- Updates reading_documents table schema if needed
- Ensures all foreign key constraints use CASCADE delete
- Adds any missing RLS policies

## Running Migrations

To set up a new database:

```bash
# Run all migrations in order
psql -h your-host -U your-user -d your-database -f 00001_initial_schema.sql
psql -h your-host -U your-user -d your-database -f 00002_indexes.sql
psql -h your-host -U your-user -d your-database -f 00003_rls_policies.sql
psql -h your-host -U your-user -d your-database -f 00004_functions_triggers.sql
psql -h your-host -U your-user -d your-database -f 00005_storage_and_updates.sql
```

Or using Supabase CLI:
```bash
supabase db reset
```

## Notes

- These migrations assume a fresh database with auth.users table already created by Supabase
- The `uuid-ossp` extension is required and will be enabled by the first migration
- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
- RLS is enabled on all tables for security