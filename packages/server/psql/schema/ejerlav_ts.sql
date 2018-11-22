-- Init function
DROP FUNCTION IF EXISTS ejerlav_ts_init() CASCADE;
CREATE FUNCTION ejerlav_ts_init() RETURNS void
LANGUAGE plpgsql AS
  $$
  BEGIN
    NULL;
  END;
$$;
