# ClassBots Supabase Setup

This directory contains clean, organized SQL scripts for setting up the ClassBots Supabase database from scratch.

## Directory Structure

- **migrations/** - Core database structure and functionality
  - `01_initial_schema.sql` - Tables, relationships, and indexes
  - `02_functions_triggers.sql` - Database functions and triggers
  - `03_realtime_setup.sql` - Realtime configuration for chat

- **policies/** - Row-Level Security policies
  - `01_base_policies.sql` - Access control for all tables

- **seeds/** - Optional seed data for development
  - `seed_data.sql` - Minimal test data

## Usage

### Setting Up a Fresh Database

```bash
# Apply migrations in order
supabase db execute --file migrations/01_initial_schema.sql
supabase db execute --file migrations/02_functions_triggers.sql
supabase db execute --file migrations/03_realtime_setup.sql

# Apply security policies
supabase db execute --file policies/01_base_policies.sql

# (Optional) Add seed data
supabase db execute --file seeds/seed_data.sql
```

### Using Supabase CLI for a Complete Reset

For a complete reset of your database:

```bash
cd /path/to/classbots-project
supabase db reset
```

Note: This assumes you've configured Supabase migrations to use these files.

## Important Notes

### Type Casting in RLS Policies

All RLS policies in this setup properly handle type casting:

- UUID columns compared with `auth.uid()::uuid`
- TEXT columns compared with `auth.uid()::text`

This prevents the "operator does not exist: uuid = text" error.

### Realtime Configuration

The realtime setup is configured to:

1. Publish chat message changes to clients
2. Include a small delay to prevent message duplication
3. Properly clean up on client disconnection

### Admin API Access

For server-side operations where RLS might be too restrictive, use the admin client:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

// In your API route
const supabaseAdmin = createAdminClient();

// This bypasses RLS policies
const { data, error } = await supabaseAdmin
  .from('table_name')
  .select('*');
```