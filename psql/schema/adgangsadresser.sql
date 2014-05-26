DROP TABLE IF EXISTS adgangsadresser CASCADE;
CREATE TABLE  adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
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
  esrejendomsnr integer NULL,
  oprettet timestamptz,
  ikraftfra timestamptz,
  aendret timestamptz,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  wgs84lat double precision NULL,
  wgs84long double precision NULL,
  noejagtighed CHAR(1) NULL,
  kilde integer NULL,
  placering char(1),
  tekniskstandard CHAR(2) NULL,
  tekstretning DECIMAL(5,2) NULL,
  kn100mdk VARCHAR(15) NULL,
  kn1kmdk VARCHAR(15) NULL,
  kn10kmdk VARCHAR(15) NULL,
  adressepunktaendringsdato timestamptz NULL,
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
  esrejendomsnr integer NULL,
  oprettet timestamptz,
  ikraftfra timestamptz,
  aendret timestamptz,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  wgs84lat double precision NULL,
  wgs84long double precision NULL,
  noejagtighed CHAR(1) NULL,
  kilde integer NULL,
  placering char(1),
  tekniskstandard CHAR(2) NULL,
  tekstretning DECIMAL(5,2) NULL,
  kn100mdk VARCHAR(15) NULL,
  kn1kmdk VARCHAR(15) NULL,
  kn10kmdk VARCHAR(15) NULL,
  adressepunktaendringsdato timestamptz NULL
);

CREATE INDEX ON adgangsadresser_history(valid_to);
CREATE INDEX ON adgangsadresser_history(valid_from);
CREATE INDEX ON adgangsadresser_history(id);
-- Init function

DROP FUNCTION IF EXISTS adgangsadresser_init_tsv() CASCADE;
CREATE FUNCTION adgangsadresser_init_tsv()
  RETURNS VOID LANGUAGE SQL AS
  $$
  UPDATE adgangsadresser
  SET tsv = newtsvs.tsv
  FROM
    (select adgangsadresser.id, setweight(vejstykker.tsv, 'A') || setweight(to_tsvector('adresser', husnr), 'A') ||
                                setweight(to_tsvector('adresser', COALESCE(supplerendebynavn, '')), 'C') ||
                                setweight(postnumre.tsv, 'D') AS tsv FROM adgangsadresser left join postnumre on adgangsadresser.postnr = postnumre.nr
      left join vejstykker ON adgangsadresser.kommunekode = vejstykker.kommunekode and adgangsadresser.vejkode = vejstykker.kode) as newtsvs
  WHERE
      adgangsadresser.id = newtsvs.id and adgangsadresser.tsv is distinct from newtsvs.tsv;
  $$;

DROP FUNCTION IF EXISTS adgangsadresser_init() CASCADE;
CREATE FUNCTION adgangsadresser_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    PERFORM adgangsadresser_init_tsv();
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