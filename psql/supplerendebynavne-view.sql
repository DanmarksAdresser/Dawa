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
    INSERT INTO SupplerendeBynavne(supplerendebynavn, kommunekode, postnr)
      SELECT DISTINCT supplerendebynavn, kommunekode, postnr FROM AdgangsAdresser
      WHERE supplerendebynavn IS NOT NULL and kommunekode IS NOT NULL and postnr IS NOT NULL;

    UPDATE SupplerendeBynavne SET tsv = to_tsvector('danish', supplerendebynavn);
    NULL;
  END;
$$;
