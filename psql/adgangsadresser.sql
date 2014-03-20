
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS adgangsadresser CASCADE;
CREATE TABLE  adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  bygningsnavn VARCHAR(255) NULL,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  vejnavn VARCHAR(255) NOT NULL,
  husnr VARCHAR(6) NOT NULL,
  supplerendebynavn VARCHAR(34) NULL,
  postnr INTEGER NULL,
  postnrnavn VARCHAR(20) NULL,
  ejerlavkode INTEGER NOT NULL,
  ejerlavnavn VARCHAR(255) NULL,
  matrikelnr VARCHAR(7) NULL,
  esrejendomsnr CHAR(6) NULL,
  oprettet VARCHAR(255) NOT NULL,
  ikraftfra timestamp,
  aendret VARCHAR(255) NOT NULL,
  etrs89oest DECIMAL(8,2) NULL,
  etrs89nord DECIMAL(9,2) NULL,
  wgs84lat DECIMAL(16,14) NULL,
  wgs84long DECIMAL(16,14) NULL,
  wgs84 GEOGRAPHY(POINT, 4326),
  noejagtighed CHAR(1) NOT NULL,
  kilde CHAR(1) NULL,
  tekniskstandard CHAR(2) NULL,
  tekstretning DECIMAL(5,2) NULL,
  kn100mdk VARCHAR(15) NULL,
  kn1kmdk VARCHAR(15) NULL,
  kn10kmdk VARCHAR(15) NULL,
  adressepunktaendringsdato TIMESTAMP NULL,
  geom  geometry(point, 25832),
  tsv tsvector
);
CREATE INDEX ON Adgangsadresser USING GIST (geom);
CREATE INDEX ON Adgangsadresser(ejerlavkode, id);
CREATE INDEX ON Adgangsadresser(wgs84lat);
CREATE INDEX ON Adgangsadresser(wgs84long);
CREATE INDEX ON Adgangsadresser(kommunekode, vejkode, postnr);
CREATE INDEX ON adgangsadresser(postnr, kommunekode);
CREATE INDEX ON adgangsadresser(supplerendebynavn, kommunekode, postnr);
CREATE INDEX ON adgangsadresser(matrikelnr);
CREATE INDEX ON adgangsadresser(husnr, id);
CREATE INDEX ON adgangsadresser(esrejendomsnr);
CREATE INDEX ON adgangsadresser USING gin(tsv);


-- Init function
DROP FUNCTION IF EXISTS adgangsadresser_init() CASCADE;
CREATE FUNCTION adgangsadresser_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    UPDATE adgangsadresser
    SET tsv = setweight(vejstykker.tsv, 'A') || setweight(to_tsvector('adresser', husnr), 'A') ||
        setweight(to_tsvector('adresser', COALESCE(supplerendebynavn, '')), 'C') ||
        setweight(postnumre.tsv, 'D')
    FROM
      postnumre, vejstykker
    WHERE
      postnumre.nr = adgangsadresser.postnr AND vejstykker.kommunekode = adgangsadresser.kommunekode AND
      vejstykker.kode = adgangsadresser.vejkode;

    UPDATE adgangsadresser SET wgs84 = ST_GeometryFromText('POINT('||wgs84long||' '||wgs84lat||')', 4326)
    WHERE wgs84lat IS NOT NULL AND wgs84long IS NOT NULL;

    UPDATE adgangsadresser SET geom = ST_SetSRID(ST_MakePoint(etrs89oest, etrs89nord), 25832);
  END;
$$;

DROP FUNCTION adgangsadresser_refresh_tsv(uuid[]);
CREATE OR REPLACE FUNCTION adgangsadresser_refresh_tsv(uuids uuid[])
  RETURNS VOID
LANGUAGE plpgsql AS
  $$
  BEGIN
    UPDATE adgangsadresser
    SET tsv = setweight(vejstykker.tsv, 'A') || setweight(to_tsvector('adresser', husnr), 'A') ||
              setweight(to_tsvector('adresser', COALESCE(supplerendebynavn, '')), 'C') ||
              setweight(postnumre.tsv, 'D')
    FROM
      postnumre, vejstykker
    WHERE
      postnumre.nr = adgangsadresser.postnr AND vejstykker.kommunekode = adgangsadresser.kommunekode AND
      vejstykker.kode = adgangsadresser.vejkode AND adgangsadresser.id = ANY (uuids);
  END;
  $$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION adgangsadresser_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = (SELECT setweight(vejstykker.tsv, 'A') || setweight(to_tsvector('adresser', NEW.husnr), 'A') ||
            setweight(to_tsvector('adresser', COALESCE(NEW.supplerendebynavn, '')), 'C') ||
            setweight(postnumre.tsv, 'D')
  FROM
  postnumre, vejstykker
  WHERE
  postnumre.nr = NEW.postnr AND vejstykker.kommunekode = NEW.kommunekode AND
  vejstykker.kode = NEW.vejkode);
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER adgangsadresser_tsv_update BEFORE INSERT OR UPDATE
ON adgangsadresser FOR EACH ROW EXECUTE PROCEDURE
  adgangsadresser_tsv_update();


-- Triggers which maintains the tsv column when vejstykke changes
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update_on_vejstykke() CASCADE;
CREATE OR REPLACE FUNCTION adgangsadresser_tsv_update_on_vejstykke()
  RETURNS TRIGGER AS $$
BEGIN
  PERFORM adgangsadresser_refresh_tsv((SELECT array_agg(id) FROM adgangsadresser WHERE adgangsadresser.vejkode = NEW.kode AND adgangsadresser.kommunekode = NEW.kommunekode));
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER adgangsadresser_tsv_update_on_vejstykke AFTER INSERT OR UPDATE
ON vejstykker FOR EACH ROW EXECUTE PROCEDURE
  adgangsadresser_tsv_update_on_vejstykke();

-- Triggers which maintains the tsv column when postnummer changes
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update_on_postnummer() CASCADE;
CREATE OR REPLACE FUNCTION adgangsadresser_tsv_update_on_postnummer()
  RETURNS TRIGGER AS $$
BEGIN
  PERFORM adgangsadresser_refresh_tsv((SELECT array_agg(id) FROM adgangsadresser WHERE adgangsadresser.postnr = NEW.nr));
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER adgangsadresser_tsv_update_on_postnummer AFTER INSERT OR UPDATE
ON postnumre FOR EACH ROW EXECUTE PROCEDURE
  adgangsadresser_tsv_update_on_postnummer();