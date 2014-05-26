DROP TABLE IF EXISTS stormodtagere;
CREATE TABLE IF NOT EXISTS stormodtagere (
  nr integer NOT NULL,
  navn VARCHAR(20) NOT NULL,
  adgangsadresseid UUID NOT NULL
);


-- Init function
DROP FUNCTION IF EXISTS stormodtagere_init() CASCADE;
CREATE FUNCTION stormodtagere_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    RETURN;
  END;
$$;
