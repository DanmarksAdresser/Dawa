
\set ON_ERROR_STOP on
\set ECHO queries

\echo '***************************************************************************'
\echo '*** Documentation *********************************************************'
\echo '***************************************************************************'
\echo ''
\echo 'Psql script for creating and populating the Dawa database'
\echo ''
\echo '!Expects a database to exist and that it has PostGIS installed.'
\echo ''
\echo 'To create a database:'
\echo ''
\echo '  postgres=> CREATE DATABASE dawa;'
\echo ''
\echo 'To setup PostGIS (in the dawa database):'
\echo ''
\echo '  dawa=> CREATE EXTENSION postgis;'
\echo '  dawa=> CREATE EXTENSION postgis_topology;'
\echo ''
\echo ''
\echo '!Expects data file to be placed in the data directory.'
\echo ''
\echo 'The raw data consists of 4 files, that can be downloaded from'
\echo 'http://file.aws.dk/csv.html:'
\echo ''
\echo '  $~/dawa/data> wget http://file.aws.dk/csv/AddressAccess.csv.gz'
\echo '  $~/dawa/data> wget http://file.aws.dk/csv/AddressSpecific.csv.gz'
\echo '  $~/dawa/data> wget http://file.aws.dk/csv/RoadName.csv.gz'
\echo '  $~/dawa/data> wget http://file.aws.dk/csv/PostCode.csv.gz'
\echo ''
\echo ''
\echo '!Expects to be run with CWD set to the root of the Dawa repository.'
\echo ''
\echo 'Run the script with:'
\echo ''
\echo '  $~/dawa> psql -h <DB-host> dawa <DB-user> -f psql/schema.sql'
\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** Tables creation *******************************************************'
\echo '***************************************************************************'
\echo ''

\echo '***** Create text search config for address search'
DROP   TEXT SEARCH CONFIGURATION IF EXISTS vejnavne;
CREATE TEXT SEARCH CONFIGURATION vejnavne (copy=simple);
ALTER  TEXT SEARCH CONFIGURATION vejnavne ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH simple;

DROP TABLE IF EXISTS Kommuner CASCADE;

DROP TYPE IF EXISTS PostnummerRef CASCADE;
CREATE TYPE PostnummerRef AS (
  nr integer,
  navn varchar
);

DROP TYPE IF EXISTS KommuneRef CASCADE;
CREATE TYPE KommuneRef AS (
  kode integer,
  navn varchar
);

DROP TYPE IF EXISTS DagiTemaType CASCADE;
CREATE TYPE DagiTemaType AS ENUM ('kommune', 'region', 'sogn', 'opstillingskreds', 'politikreds', 'retskreds', 'afstemningsområde', 'postdistrikt');

DROP TYPE IF EXISTS DagiTemaRef CASCADE;
CREATE TYPE DagiTemaRef AS (
  tema DagiTemaType,
  kode integer,
  navn varchar(255)
);

DROP TABLE IF EXISTS DagiTemaer CASCADE;
CREATE TABLE DagiTemaer (
  tema DagiTemaType not null,
  kode integer not null,
  navn varchar(255),
  geom  geometry(MultiPolygon, 25832),
  tsv tsvector,
  PRIMARY KEY(tema, kode)
);

CREATE INDEX ON DagiTemaer USING gist(geom);
CREATE INDEX ON DagiTemaer(navn);

\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** Tables creation *******************************************************'
\echo '***************************************************************************'
\echo ''
\echo '***** Creating vejstykker table'
DROP TABLE IF EXISTS vejstykker CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  version VARCHAR(255) NOT NULL,
  vejnavn VARCHAR(255) NOT NULL,
  tsv tsvector,
  PRIMARY KEY(kommunekode, kode)
);

CREATE INDEX ON vejstykker USING gin(tsv);
CREATE INDEX ON vejstykker(kode);

\COPY vejstykker (kommunekode, kode, vejnavn, version) from program 'gunzip -c :DATADIR:/RoadName.csv.gz' WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

UPDATE vejstykker SET tsv = to_tsvector('danish', coalesce(vejnavn, ''));


\echo '\n***** Creating postnumre table'
DROP TABLE IF EXISTS postnumre CASCADE;
CREATE TABLE IF NOT EXISTS postnumre (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL,
  tsv tsvector
);

CREATE INDEX ON postnumre USING gin(tsv);
CREATE INDEX ON postnumre(navn);

\echo '\n***** Loading postnumre data'
\COPY postnumre (nr, version, navn) from program 'gunzip -c :DATADIR:/PostCode.csv.gz' WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');
UPDATE postnumre SET tsv = to_tsvector('danish', coalesce(to_char(nr,'0000'), '') || ' ' || coalesce(navn, ''));

\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** adgangsadresser - takes some time *************************************'
\echo '***************************************************************************'
\echo ''
\echo '***** Creating adgangsadresse table'
DROP TABLE IF EXISTS adgangsadresser CASCADE;
CREATE TABLE  adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  bygningsnavn VARCHAR(255) NULL,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  vejnavn VARCHAR(255) NOT NULL,  -- Will be dropped later (normalization)!
  husnr VARCHAR(6) NOT NULL,
  supplerendebynavn VARCHAR(34) NULL,
  postnr INTEGER NULL,
  postnrnavn VARCHAR(20) NULL,  -- Will be dropped later (normalization)!
  ejerlavkode INTEGER NOT NULL,
  ejerlavnavn VARCHAR(255) NULL,  -- Will be dropped again when the ejerlav table is created (normalization)!
  matrikelnr VARCHAR(7) NULL,
  esrejendomsnr CHAR(6) NULL,
  oprettet VARCHAR(255) NOT NULL,
  ikraftfra timestamp, -- TODO NOT NULL,
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


\echo '\n***** Loading adgangsadresse data'
\COPY adgangsadresser (id, version, bygningsnavn, kommunekode, vejkode, vejnavn, husnr, supplerendebynavn, postnr, postnrnavn, ejerlavkode, ejerlavnavn, matrikelnr, esrejendomsnr, oprettet, ikraftfra, aendret, etrs89oest, etrs89nord, wgs84lat, wgs84long, noejagtighed, kilde, tekniskstandard, tekstretning, kn100mdk, kn1kmdk, kn10kmdk, adressepunktaendringsdato) from  program 'gunzip -c :DATADIR:/AddressAccess.csv.gz | sed -f :SCRIPTDIR:/replaceDoubleQuotes.sed' WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

UPDATE adgangsadresser
SET tsv = to_tsvector('danish',
                      coalesce(vejstykker.vejnavn, '') || ' '
                      || coalesce(husnr, '') || ' '
                      || coalesce(supplerendebynavn, '') || ' '
                      || coalesce(to_char(postnr, '0000'), '')
                      || coalesce(postnumre.navn, '') || ' ')
FROM
  postnumre, vejstykker
WHERE
  postnumre.nr = adgangsadresser.postnr AND vejstykker.kommunekode = adgangsadresser.kommunekode AND
  vejstykker.kode = adgangsadresser.vejkode;

CREATE INDEX ON adgangsadresser USING gin(tsv);

\echo '\n***** Updating wgs84 and geom columns'
UPDATE adgangsadresser SET wgs84 = ST_GeometryFromText('POINT('||wgs84long||' '||wgs84lat||')', 4326)
WHERE wgs84lat IS NOT NULL AND wgs84long IS NOT NULL;

UPDATE adgangsadresser SET geom = ST_SetSRID(ST_MakePoint(etrs89oest, etrs89nord), 25832);

\echo '\n***** Correcting data error in ejerlav'
UPDATE adgangsadresser SET ejerlavnavn = 'DEN NORDVESTLIGE DEL, HØRBY'
WHERE ejerlavkode = 550755;
UPDATE adgangsadresser SET ejerlavnavn = 'GØDSBØL, LINDEBALLE'
WHERE ejerlavkode = 1130653;


\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** ejerlav ***************************************************************'
\echo '***************************************************************************'
\echo ''
\echo '***** Creating ejerlav table'
DROP TABLE IF EXISTS ejerlav;
CREATE TABLE IF NOT EXISTS ejerlav (
  kode integer NOT NULL PRIMARY KEY,
  navn VARCHAR(50) NOT NULL
);

\echo '\n***** Loading data into ejerlav table'
INSERT INTO ejerlav SELECT ejerlavkode, ejerlavnavn FROM adgangsadresser WHERE ejerlavkode <> 0 GROUP BY ejerlavkode, ejerlavnavn;

\echo '\n***** Cleaning up adgangsadresser'
ALTER TABLE adgangsadresser DROP COLUMN ejerlavnavn;
ALTER TABLE adgangsadresser DROP COLUMN postnrnavn;
ALTER TABLE adgangsadresser DROP COLUMN vejnavn;


\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** enhedsadresser - takes some time **************************************'
\echo '***************************************************************************'
\echo ''
\echo '***** Creating enhedsadresser table'
DROP TABLE IF EXISTS enhedsadresser;
CREATE TABLE IF NOT EXISTS enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version timestamp NOT NULL,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamp, -- TODO NOT NULL,
  ikraftfra timestamp, -- TODO NOT NULL,
  aendret timestamp NOT NULL,
  etage VARCHAR(3),
  doer VARCHAR(4),
  tsv tsvector
);
CREATE INDEX ON enhedsadresser(adgangsadresseid);
CREATE INDEX ON enhedsadresser USING gin(tsv);
CREATE INDEX ON enhedsadresser(etage, id);
CREATE INDEX ON enhedsadresser(doer, id);

\echo '\n***** Loading enhedsadresser data'
\COPY enhedsadresser (id, version, adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer) from program 'gunzip -c :DATADIR:/AddressSpecific.csv.gz' WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

\echo '\n***** Populate text search column'

create temp table tmp  AS select id,
                                 to_tsvector('danish',
                                                coalesce(etage,                  '') || ' ' || coalesce(doer,    '') || ' '
                                             || coalesce(postnrnavn,             '') || ' ' || coalesce(vejnavn, '') || ' '
                                             || coalesce(to_char(postnr,'0000'), '') || ' ' || coalesce(husnr,   ''))
         AS tsv
  FROM (SELECT e.id, etage, doer, p.navn as postnrnavn, v.vejnavn, p.nr as postnr, husnr
        FROM enhedsadresser e
        LEFT JOIN adgangsadresser a ON a.id = e.adgangsadresseid
        LEFT JOIN vejstykker v ON a.vejkode = v.kode AND a.kommunekode = v.kommunekode
        LEFT JOIN postnumre p ON  a.postnr = p.nr) as T;

UPDATE enhedsadresser AS e SET tsv = T.tsv from (select * from tmp) as T where e.id = T.id;

DROP TABLE tmp;

DROP VIEW IF EXISTS vejstykkerPostnr;
CREATE VIEW vejstykkerPostnr AS SELECT DISTINCT vejkode, kommunekode, postnr FROM AdgangsAdresser;

DROP VIEW IF EXISTS PostnumreMini;
CREATE VIEW PostnumreMini AS
  SELECT nr, navn FROM Postnumre;

DROP VIEW IF EXISTS vejstykkerView;
CREATE VIEW vejstykkerView AS
  SELECT
    vejstykker.kode,
    vejstykker.kommunekode,
    vejstykker.version,
    vejnavn,
    vejstykker.tsv,
    max(kommuner.navn) AS kommunenavn,
    json_agg(PostnumreMini) AS postnumre
  FROM vejstykker
    LEFT JOIN Dagitemaer kommuner ON kommuner.tema = 'kommune' AND vejstykker.kommunekode = kommuner.kode
    LEFT JOIN vejstykkerPostnr
      ON (vejstykkerPostnr.kommunekode = vejstykker.kommunekode AND vejstykkerPostnr.vejkode = vejstykker.kode)
    LEFT JOIN PostnumreMini ON (PostnumreMini.nr = postnr)
  GROUP BY vejstykker.kode, vejstykker.kommunekode;

DROP TABLE IF EXISTS VejstykkerPostnumreMat CASCADE;
CREATE TABLE VejstykkerPostnumreMat(
  kommunekode INTEGER,
  vejkode INTEGER,
  postnr INTEGER
);

INSERT INTO VejstykkerPostnumreMat SELECT DISTINCT kommunekode, vejkode, postnr FROM adgangsadresser;

DROP FUNCTION IF EXISTS update_vejstykker_postnumre_mat() CASCADE;

CREATE FUNCTION update_vejstykker_postnumre_mat() RETURNS trigger AS $$
    BEGIN
        IF TG_OP='UPDATE' OR TG_OP='DELETE' THEN
          IF NOT EXISTS(SELECT * FROM adgangsadresser WHERE OLD.vejkode IS NOT DISTINCT FROM  vejkode AND OLD.kommunekode IS NOT DISTINCT FROM kommunekode AND OLD.postnr IS NOT DISTINCT FROM  postnr) THEN
            DELETE FROM VejstykkerPostnumreMat WHERE OLD.vejkode IS NOT DISTINCT FROM  vejkode AND OLD.kommunekode IS NOT DISTINCT FROM  kommunekode AND OLD.postnr IS NOT DISTINCT FROM  postnr;
          END IF;
        END IF;
      IF TG_OP='UPDATE' OR TG_OP='INSERT' THEN
        IF NOT EXISTS(SELECT * FROM VejstykkerPostnumreMat WHERE NEW.vejkode IS NOT DISTINCT FROM  vejkode AND NEW.kommunekode IS NOT DISTINCT FROM  kommunekode AND NEW.postnr IS NOT DISTINCT FROM  postnr) THEN
          INSERT INTO VejstykkerPostnumreMat(kommunekode, vejkode, postnr) VALUES (NEW.kommunekode, NEW.vejkode, NEW.postnr);
        END IF;
      END IF;
      RETURN NULL;
    END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vejstykker_postnumre_mat ON adgangsadresser;
CREATE TRIGGER update_vejstykker_postnumre_mat AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE update_vejstykker_postnumre_mat();

CREATE UNIQUE INDEX ON VejstykkerPostnumreMat(postnr, kommunekode, vejkode);
CREATE INDEX ON vejstykkerpostnumremat(kommunekode, vejkode);

DROP TABLE IF EXISTS PostnumreKommunekoderMat;
CREATE TABLE PostnumreKommunekoderMat(postnr integer not null, kommunekode integer not null, primary key(postnr, kommunekode));
INSERT INTO PostnumreKommunekoderMat SELECT DISTINCT postnr, kommunekode FROM VejstykkerPostnumreMat
WHERE postnr is not null and kommunekode is not null;


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

INSERT INTO SupplerendeBynavne(supplerendebynavn, kommunekode, postnr)
  SELECT DISTINCT supplerendebynavn, kommunekode, postnr FROM AdgangsAdresser
  WHERE supplerendebynavn IS NOT NULL and kommunekode IS NOT NULL and postnr IS NOT NULL;

UPDATE SupplerendeBynavne SET tsv = to_tsvector('danish', supplerendebynavn);


DROP TABLE IF EXISTS AdgangsadresserDagiRel CASCADE;
CREATE TABLE AdgangsAdresserDagiRel(
  adgangsadresseid uuid not null,
  dagitema DagiTemaType not null,
  dagikode integer not null,
  primary key(adgangsadresseid, dagitema, dagikode)
);



CREATE INDEX ON AdgangsadresserDagiRel(dagiTema, dagiKode, adgangsadresseid);

CREATE OR REPLACE FUNCTION makeRectangle(xmin DOUBLE PRECISION,
                                         ymin DOUBLE PRECISION, xmax DOUBLE PRECISION,
                                         ymax DOUBLE PRECISION, srid integer)
  RETURNS geometry AS
  $$
  BEGIN
    RETURN st_setsrid(st_makepolygon(st_makeline(ARRAY [st_makepoint(xmin, ymin), st_makepoint(xmin, ymax), st_makepoint(xmax,
                                                                                                              ymax), st_makepoint(
        xmax, ymin), st_makepoint(xmin, ymin)])), srid);
  END;
  $$ LANGUAGE plpgsql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION splitToGridRecursive(g geometry,  maxPointCount INTEGER)
  RETURNS SETOF geometry AS
  $$
  DECLARE
    xmin DOUBLE PRECISION;
    xmax   DOUBLE PRECISION;
    ymin   DOUBLE PRECISION;
    ymax   DOUBLE PRECISION;
    dx   DOUBLE PRECISION;
    dy DOUBLE PRECISION;
    r1 geometry;
    r2 geometry;
    i1 geometry;
    i2 geometry;
    points INTEGER;
  srid integer;
  BEGIN
    points := ST_NPoints(g);
--    RAISE NOTICE 'Points: (%)', points;

    IF points <= maxPointCount THEN
      RETURN QUERY SELECT g;
      RETURN;
    END IF;
    xmin := ST_XMin(g);
    xmax := ST_XMax(g);
    ymin := ST_YMin(g);
    ymax := ST_YMax(g);
    dx := xmax - xmin;
    dy := ymax - ymin;
      srid := st_srid(g);
--    RAISE NOTICE 'xmin: (%), ymin: (%), xmax: (%), ymax: (%)', xmin, ymin, xmax, ymax;
    IF(dx > dy) THEN
      r1 := makeRectangle(xmin, ymin, xmin + dx/2, ymax, srid);
      r2 := makeRectangle(xmin + dx/2, ymin, xmax, ymax, srid);
    ELSE
      r1 := makeRectangle(xmin, ymin, xmax, ymin + dy/2, srid);
      r2 := makeRectangle(xmin, ymin + dy/2, xmax, ymax, srid);
    END IF;
    i1 := st_intersection(g, r1);
    i2 := st_intersection(g, r2);
    RETURN QUERY SELECT splitToGridRecursive(i1, maxPointCount);
    RETURN QUERY SELECT splitToGridRecursive(i2, maxPointCount);
    RETURN;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE STRICT;

DROP TABLE IF EXISTS GriddedDagiTemaer;
CREATE TABLE GriddedDagiTemaer(
  tema dagiTemaType not null,
  kode integer not null,
  geom geometry
);

CREATE INDEX ON GriddedDagiTemaer(tema, kode);
CREATE INDEX ON GriddedDagiTemaer USING GIST(geom);

CREATE OR REPLACE FUNCTION update_dagi_temaer_tsv()
  RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    NEW.tsv = to_tsvector('danish', NEW.kode || ' ' || COALESCE(NEW.navn, ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION update_gridded_dagi_temaer()
  RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.geom = NEW.geom THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
  THEN
    DELETE FROM GriddedDagiTemaer WHERE tema = OLD.tema AND kode = OLD.kode;
    DELETE FROM AdgangsAdresserDagiRel WHERE dagiTema = OLD.tema AND dagiKode = OLD.kode;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    INSERT INTO GriddedDagiTemaer (tema, kode, geom)
      (SELECT
         NEW.tema,
        NEW.kode,
         splitToGridRecursive(NEW.geom, 100) as geom);
    INSERT INTO AdgangsadresserDagiRel(adgangsadresseid, dagitema, dagikode)
      (SELECT DISTINCT Adgangsadresser.id, GriddedDagiTemaer.tema, GriddedDagiTemaer.kode
       FROM Adgangsadresser
         JOIN GriddedDagiTemaer ON ST_Contains(GriddedDagiTemaer.geom, Adgangsadresser.geom)
      WHERE
        GriddedDagiTemaer.tema = NEW.tema AND GriddedDagiTemaer.kode = NEW.kode);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION update_adgangsadresser_dagi_rel_adgangsadresser()
  RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.geom = NEW.geom) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
  THEN
    DELETE FROM AdgangsadresserDagiRel WHERE adgangsadresseid = OLD.id;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    INSERT INTO AdgangsadresserDagiRel (adgangsadresseid, dagiTema, dagiKode)
      (SELECT DISTINCT
         Adgangsadresser.id,
         Dagitemaer.tema,
         Dagitemaer.kode
       FROM Adgangsadresser, GriddedDagitemaer
       WHERE Adgangsadresser.id = NEW.id AND ST_Contains(GriddedDagitemaer.geom, Adgangsadresser.geom));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dagi_temaer_tsv ON DagiTemaer;
CREATE TRIGGER update_dagi_temaer_tsv BEFORE INSERT OR UPDATE ON DagiTemaer
FOR EACH ROW EXECUTE PROCEDURE update_dagi_temaer_tsv();

DROP TRIGGER IF EXISTS update_adgangsadresser_dagi_rel_adgangsadresser ON adgangsadresser;
CREATE TRIGGER update_adgangsadresser_dagi_rel_adgangsadresser AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE update_adgangsadresser_dagi_rel_adgangsadresser();

DROP TRIGGER IF EXISTS update_adgangsadresser_dagi_rel_dagitemaer ON DagiTemaer;
DROP TRIGGER IF EXISTS update_gridded_dagi_temaer ON DagiTemaer;
CREATE TRIGGER update_gridded_dagi_temaer AFTER INSERT OR UPDATE OR DELETE ON DagiTemaer
FOR EACH ROW EXECUTE PROCEDURE update_gridded_dagi_temaer();

\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** adresser view *********************************************************'
\echo '***************************************************************************'
\echo ''

DROP VIEW IF EXISTS Adresser CASCADE;
DROP VIEW IF EXISTS AdgangsadresserView CASCADE;
CREATE VIEW AdgangsadresserView AS
  SELECT
    A.id as a_id,
    A.version AS a_version,
    A.bygningsnavn,
    A.husnr,
    A.supplerendebynavn,
    A.matrikelnr,
    A.esrejendomsnr,
    A.oprettet AS a_oprettet,
    A.ikraftfra as a_ikraftfra,
    A.aendret  AS a_aendret,
    A.etrs89oest::double precision AS oest,
    A.etrs89nord::double precision AS nord,
    A.wgs84lat::double precision   AS lat,
    A.wgs84long::double precision  AS long,
    A.wgs84,
    A.geom       AS geom,
    A.noejagtighed,
    A.kilde::smallint,
    A.tekniskstandard,
    A.tekstretning::double precision,
    A.kn100mdk,
    A.kn1kmdk,
    A.kn10kmdk,
    A.adressepunktaendringsdato,

    P.nr   AS postnr,
    P.navn AS postnrnavn,

    V.kode    AS vejkode,
    V.vejnavn AS vejnavn,

    LAV.kode AS ejerlavkode,
    LAV.navn AS ejerlavnavn,

    K.kode AS kommunekode,
    K.navn AS kommunenavn,
    array_to_json((select array_agg(DISTINCT CAST((D.tema, D.kode, D.navn) AS DagiTemaRef)) FROM AdgangsadresserDagiRel DR JOIN DagiTemaer D  ON (DR.adgangsadresseid = A.id AND D.tema = DR.dagiTema AND D.kode = DR.dagiKode))) AS dagitemaer,
    A.tsv

  FROM adgangsadresser A
    LEFT JOIN vejstykker        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
    LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
    LEFT JOIN ejerlav         AS LAV ON (A.ejerlavkode = LAV.kode)
    LEFT JOIN DagiTemaer AS K ON (K.tema = 'kommune' AND K.kode = A.kommunekode);

CREATE VIEW adresser AS
  SELECT
    E.id        AS e_id,
    E.version   AS e_version,
    E.oprettet  AS e_oprettet,
    E.ikraftfra AS e_ikraftfra,
    E.aendret   AS e_aendret,
    E.tsv       AS e_tsv,
    E.etage,
    E.doer,
    A.*
  FROM enhedsadresser E
    LEFT JOIN adgangsadresserView A  ON (E.adgangsadresseid = A.a_id);

\echo '\n***** Bootstrap complete!'

\echo '\n***** Inserting temporary test data into DagiTemaer'
DELETE FROM DagiTemaer;
INSERT INTO DagiTemaer (tema, kode, navn)
VALUES ('kommune', 165, 'Albertslund'),
('kommune', 201, 'Allerød'),
('kommune', 420, 'Assens'),
('kommune', 151, 'Ballerup'),
('kommune', 530, 'Billund'),
('kommune', 400, 'Bornholm'),
('kommune', 153, 'Brøndby'),
('kommune', 810, 'Brønderslev'),
('kommune', 155, 'Dragør'),
('kommune', 240, 'Egedal'),
('kommune', 561, 'Esbjerg'),
('kommune', 563, 'Fanø'),
('kommune', 710, 'Favrskov'),
('kommune', 320, 'Faxe'),
('kommune', 210, 'Fredensborg'),
('kommune', 607, 'Fredericia'),
('kommune', 147, 'Frederiksberg'),
('kommune', 813, 'Frederikshavn'),
('kommune', 250, 'Frederikssund'),
('kommune', 190, 'Furesø'),
('kommune', 430, 'Faaborg-Midtfyn'),
('kommune', 157, 'Gentofte'),
('kommune', 159, 'Gladsaxe'),
('kommune', 161, 'Glostrup'),
('kommune', 253, 'Greve'),
('kommune', 270, 'Gribskov'),
('kommune', 376, 'Guldborgsund'),
('kommune', 510, 'Haderslev'),
('kommune', 260, 'Halsnæs'),
('kommune', 766, 'Hedensted'),
('kommune', 217, 'Helsingør'),
('kommune', 163, 'Herlev'),
('kommune', 657, 'Herning'),
('kommune', 219, 'Hillerød'),
('kommune', 860, 'Hjørring'),
('kommune', 316, 'Holbæk'),
('kommune', 661, 'Holstebro'),
('kommune', 615, 'Horsens'),
('kommune', 167, 'Hvidovre'),
('kommune', 169, 'Høje-Taastrup'),
('kommune', 223, 'Hørsholm'),
('kommune', 756, 'Ikast-Brande'),
('kommune', 183, 'Ishøj'),
('kommune', 849, 'Jammerbugt'),
('kommune', 326, 'Kalundborg'),
('kommune', 440, 'Kerteminde'),
('kommune', 621, 'Kolding'),
('kommune', 101, 'København'),
('kommune', 259, 'Køge'),
('kommune', 482, 'Langeland'),
('kommune', 350, 'Lejre'),
('kommune', 665, 'Lemvig'),
('kommune', 360, 'Lolland'),
('kommune', 173, 'Lyngby-Taarbæk'),
('kommune', 825, 'Læsø'),
('kommune', 846, 'Mariagerfjord'),
('kommune', 410, 'Middelfart'),
('kommune', 773, 'Morsø'),
('kommune', 707, 'Norddjurs'),
('kommune', 480, 'Nordfyns'),
('kommune', 450, 'Nyborg'),
('kommune', 370, 'Næstved'),
('kommune', 727, 'Odder'),
('kommune', 461, 'Odense'),
('kommune', 306, 'Odsherred'),
('kommune', 730, 'Randers'),
('kommune', 840, 'Rebild'),
('kommune', 760, 'Ringkøbing-Skjern'),
('kommune', 329, 'Ringsted'),
('kommune', 265, 'Roskilde'),
('kommune', 230, 'Rudersdal'),
('kommune', 175, 'Rødovre'),
('kommune', 741, 'Samsø'),
('kommune', 740, 'Silkeborg'),
('kommune', 746, 'Skanderborg'),
('kommune', 779, 'Skive'),
('kommune', 330, 'Slagelse'),
('kommune', 269, 'Solrød'),
('kommune', 340, 'Sorø'),
('kommune', 336, 'Stevns'),
('kommune', 671, 'Struer'),
('kommune', 479, 'Svendborg'),
('kommune', 706, 'Syddjurs'),
('kommune', 540, 'Sønderborg'),
('kommune', 787, 'Thisted'),
('kommune', 550, 'Tønder'),
('kommune', 185, 'Tårnby'),
('kommune', 187, 'Vallensbæk'),
('kommune', 573, 'Varde'),
('kommune', 575, 'Vejen'),
('kommune', 630, 'Vejle'),
('kommune', 820, 'Vesthimmerland'),
('kommune', 791, 'Viborg'),
('kommune', 390, 'Vordingborg'),
('kommune', 492, 'Ærø'),
('kommune', 580, 'Aabenraa'),
('kommune', 851, 'Aalborg'),
('kommune', 751, 'Aarhus');

INSERT INTO DagiTemaer (tema, kode, navn)
VALUES
  ('region', 1, 'Region'),
  ('sogn', 1, 'Sogn'),
  ('opstillingskreds', 1 , 'Opstillingskreds'),
  ('retskreds', 1, 'Retskreds'),
  ('politikreds', 1, 'Politikreds'),
  ('afstemningsområde', 1, 'Afstemningsområde');

