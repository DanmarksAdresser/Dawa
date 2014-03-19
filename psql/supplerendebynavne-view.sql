
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS SupplerendeBynavne CASCADE;
CREATE TABLE SupplerendeBynavne (
  supplerendebynavn VARCHAR(34) NOT NULL,
  kommunekode INTEGER NOT NULL,
  postnr INTEGER NOT NULL,
  tsv tsvector,
  PRIMARY KEY (supplerendebynavn, kommunekode, postnr)
);

CREATE INDEX ON SupplerendeBynavne(kommunekode);
CREATE INDEX ON SupplerendeBynavne(postnr);

-- Init function
DROP FUNCTION IF EXISTS supplerendebynavne_init() CASCADE;
CREATE FUNCTION supplerendebynavne_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    NULL;
  END;
$$;
