-- Init function
DROP FUNCTION IF EXISTS transaction_history_init() CASCADE;
CREATE FUNCTION transaction_history_init() RETURNS void
LANGUAGE plpgsql AS
  $$
  BEGIN
    NULL;
  END;
$$;
