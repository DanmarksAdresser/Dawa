-- Init function
DROP FUNCTION IF EXISTS stormodtagere_init() CASCADE;
CREATE FUNCTION stormodtagere_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    RETURN;
  END;
$$;
