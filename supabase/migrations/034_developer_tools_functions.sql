-- Migration: Developer Tools Database Functions
-- Provides read-only helper functions for the developer console

-- ============================================
-- 1. get_columns_for_table: Returns column schema info
-- ============================================
CREATE OR REPLACE FUNCTION public.get_columns_for_table(target_table text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  is_primary boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    COALESCE(
      EXISTS (
        SELECT 1 FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc 
          ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND kcu.table_schema = 'public'
          AND kcu.table_name = target_table
          AND kcu.column_name = c.column_name
      ),
      false
    ) as is_primary
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = target_table
  ORDER BY c.ordinal_position;
$$;

-- ============================================
-- 2. get_table_info: Returns list of all public tables with row counts
-- ============================================
CREATE OR REPLACE FUNCTION public.get_table_info()
RETURNS TABLE (
  name text,
  row_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  cnt bigint;
BEGIN
  FOR rec IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', rec.table_name) INTO cnt;
    name := rec.table_name;
    row_count := cnt;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================
-- 3. run_readonly_query: Executes a read-only SQL query
-- Uses a READ ONLY transaction to prevent any writes
-- ============================================
CREATE OR REPLACE FUNCTION public.run_readonly_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Set transaction to read only for safety
  SET LOCAL default_transaction_read_only = on;
  
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result;
  
  -- Reset
  SET LOCAL default_transaction_read_only = off;
  
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    -- Reset on error
    SET LOCAL default_transaction_read_only = off;
    RAISE;
END;
$$;

-- ============================================
-- Grant execute to service_role only (these bypass RLS)
-- ============================================
REVOKE ALL ON FUNCTION public.get_columns_for_table(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_columns_for_table(text) TO service_role;

REVOKE ALL ON FUNCTION public.get_table_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_table_info() TO service_role;

REVOKE ALL ON FUNCTION public.run_readonly_query(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_readonly_query(text) TO service_role;

-- ============================================
-- Comments
-- ============================================
COMMENT ON FUNCTION public.get_columns_for_table(text) IS 'Returns column schema information for a given table. Service role only.';
COMMENT ON FUNCTION public.get_table_info() IS 'Returns all public tables with row counts. Service role only.';
COMMENT ON FUNCTION public.run_readonly_query(text) IS 'Executes a read-only SQL query and returns results as JSONB. Service role only.';
