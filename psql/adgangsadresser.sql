
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS adgangsadresser CASCADE;
CREATE TABLE  adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version VARCHAR(255),
  bygningsnavn VARCHAR(255) NULL,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  vejnavn VARCHAR(255),
  husnr VARCHAR(6) NOT NULL,
  supplerendebynavn VARCHAR(34) NULL,
  postnr INTEGER NULL,
  postnrnavn VARCHAR(20) NULL,
  ejerlavkode INTEGER,
  ejerlavnavn VARCHAR(255) NULL,
  matrikelnr VARCHAR(7) NULL,
  esrejendomsnr CHAR(6) NULL,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  adgangspunktid uuid,
  etrs89oest DECIMAL(8,2) NULL,
  etrs89nord DECIMAL(9,2) NULL,
  wgs84lat DECIMAL(16,14) NULL,
  wgs84long DECIMAL(16,14) NULL,
  wgs84 GEOGRAPHY(POINT, 4326),
  noejagtighed CHAR(1) NULL,
  kilde CHAR(1) NULL,
  placering char(1),
  tekniskstandard CHAR(2) NULL,
  tekstretning DECIMAL(5,2) NULL,
  kn100mdk VARCHAR(15) NULL,
  kn1kmdk VARCHAR(15) NULL,
  kn10kmdk VARCHAR(15) NULL,
  adressepunktaendringsdato TIMESTAMP NULL,
  geom  geometry(point, 25832),
  tsv tsvector
);

DROP TABLE IF EXISTS adgangsadresser_history CASCADE;
CREATE TABLE adgangsadresser_history(
  valid_from integer,
  valid_to integer,
  id uuid NOT NULL,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr VARCHAR(6) NOT NULL,
  supplerendebynavn VARCHAR(34) NULL,
  postnr INTEGER NULL,
  ejerlavkode INTEGER,
  ejerlavnavn VARCHAR(255) NULL,
  matrikelnr VARCHAR(7) NULL,
  esrejendomsnr CHAR(6) NULL,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  adgangspunktid uuid,
  etrs89oest DECIMAL(8,2) NULL,
  etrs89nord DECIMAL(9,2) NULL,
  wgs84lat DECIMAL(16,14) NULL,
  wgs84long DECIMAL(16,14) NULL,
  wgs84 GEOGRAPHY(POINT, 4326),
  noejagtighed CHAR(1) NULL,
  kilde CHAR(1) NULL,
  placering char(1),
  tekniskstandard CHAR(2) NULL,
  tekstretning DECIMAL(5,2) NULL,
  kn100mdk VARCHAR(15) NULL,
  kn1kmdk VARCHAR(15) NULL,
  kn10kmdk VARCHAR(15) NULL,
  adressepunktaendringsdato TIMESTAMP NULL
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

DROP FUNCTION IF EXISTS adgangsadresser_refresh_tsv(uuid[]) CASCADE;
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

-- Trigger which maintain history
DROP FUNCTION IF EXISTS adgangsadresser_history_update() CASCADE;
CREATE OR REPLACE FUNCTION adgangsadresser_history_update()
  RETURNS TRIGGER AS $$
DECLARE
  seqnum integer;
  optype operation_type;
BEGIN
  seqnum = (SELECT COALESCE((SELECT MAX(sequence_number) FROM transaction_history), 0) + 1);
  optype = lower(TG_OP);
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE adgangsadresser_history SET valid_to = seqnum WHERE id = OLD.id AND valid_to IS NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    INSERT INTO adgangsadresser_history(
      valid_from, id, kommunekode, vejkode, husnr, supplerendebynavn, postnr, ejerlavkode, ejerlavnavn,
      matrikelnr, esrejendomsnr, oprettet, ikraftfra, aendret,
      adgangspunktid, etrs89oest, etrs89nord, wgs84lat, wgs84long, noejagtighed, kilde, placering,
      tekniskstandard, tekstretning, kn100mdk, kn1kmdk, kn10kmdk)
    VALUES (
      seqnum, NEW.id, NEW.kommunekode, NEW.vejkode, NEW.husnr, NEW.supplerendebynavn, NEW.postnr, NEW.ejerlavkode, NEW.ejerlavnavn,
      NEW.matrikelnr, NEW.esrejendomsnr, NEW.oprettet, NEW.ikraftfra, NEW.aendret,
      NEW.adgangspunktid, NEW.etrs89oest, NEW.etrs89nord, NEW.wgs84lat, NEW.wgs84long, NEW.noejagtighed, NEW.kilde, NEW.placering,
      NEW.tekniskstandard, NEW.tekstretning, NEW.kn100mdk, NEW.kn1kmdk, NEW.kn10kmdk);
  END IF;
  INSERT INTO transaction_history(sequence_number, entity, operation) VALUES(seqnum, 'adgangsadresse', optype);
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER adgangsadresser_history_update AFTER INSERT OR UPDATE OR DELETE
ON adgangsadresser FOR EACH ROW EXECUTE PROCEDURE
  adgangsadresser_history_update();
