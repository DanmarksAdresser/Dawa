-- Init function
DROP FUNCTION IF EXISTS ejerlav_init() CASCADE;
CREATE FUNCTION ejerlav_init() RETURNS void
LANGUAGE plpgsql AS
  $$
  BEGIN
    RETURN;
  END;
$$;
