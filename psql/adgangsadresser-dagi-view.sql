
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS AdgangsadresserDagiRel CASCADE;
CREATE TABLE AdgangsAdresserDagiRel(
  adgangsadresseid uuid not null,
  dagitema DagiTemaType not null,
  dagikode integer not null,
  primary key(adgangsadresseid, dagitema, dagikode)
);

CREATE INDEX ON AdgangsadresserDagiRel(dagiTema, dagiKode, adgangsadresseid);

-- Init function
DROP FUNCTION IF EXISTS adgangsadresserdagirel_init() CASCADE;
CREATE FUNCTION adgangsadresserdagirel_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    NULL;
  END;
$$;
