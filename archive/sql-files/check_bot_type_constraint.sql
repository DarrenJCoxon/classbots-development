-- Check current bot_type constraints and values

-- 1. Check if there's a CHECK constraint on bot_type
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM 
    pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE 
    nsp.nspname = 'public'
    AND rel.relname = 'chatbots'
    AND con.contype = 'c';  -- 'c' for CHECK constraints

-- 2. Check if bot_type uses an ENUM type
SELECT 
    column_name,
    data_type,
    udt_name
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'chatbots'
    AND column_name = 'bot_type';

-- 3. If using ENUM, show the allowed values
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM 
    pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE 
    t.typname = 'bot_type_enum'
ORDER BY e.enumsortorder;

-- 4. Show current bot_type values in the database
SELECT DISTINCT bot_type, COUNT(*) as count
FROM chatbots
GROUP BY bot_type
ORDER BY bot_type;

-- 5. Check column definition
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'chatbots'
    AND column_name = 'bot_type';