
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


\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** Tables creation *******************************************************'
\echo '***************************************************************************'
\echo ''
\echo '***** Creating postnumre table'
DROP TABLE IF EXISTS vejnavne CASCADE;
CREATE TABLE IF NOT EXISTS vejnavne (
  kode integer NOT NULL,
  kommunekode integer NOT NULL,
  version VARCHAR(255) NOT NULL,
  vejnavn VARCHAR(255) NOT NULL,
  tsv tsvector,
  PRIMARY KEY(kode, kommunekode)
);

CREATE INDEX ON vejnavne USING gin(tsv);

\COPY vejnavne (kommunekode, kode, vejnavn, version) from program 'gunzip -c :DATADIR:/RoadName.csv.gz' WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

UPDATE vejnavne SET tsv = to_tsvector('vejnavne', coalesce(vejnavn, ''));


\echo '\n***** Creating postnumre table'
DROP TABLE IF EXISTS postnumre;
CREATE TABLE IF NOT EXISTS postnumre (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL,
  tsv tsvector
);

CREATE INDEX ON postnumre USING gin(tsv);

\echo '\n***** Loading postnumre data'
\COPY postnumre (nr, version, navn) from program 'gunzip -c :DATADIR:/PostCode.csv.gz' WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');
UPDATE postnumre SET tsv = to_tsvector('vejnavne', coalesce(to_char(nr,'0000'), '') || ' ' || coalesce(navn, ''));

\echo '\n***** Creating kommuner table'
DROP TABLE IF EXISTS kommuner;
CREATE TABLE IF NOT EXISTS kommuner (
  kode integer NOT NULL PRIMARY KEY,
  navn VARCHAR(20) NOT NULL
);

\echo '\n***** Inserting kommunedata data'
DELETE FROM kommuner;
INSERT INTO kommuner (kode, navn)
VALUES (165, 'Albertslund'),
       (201, 'Allerød'),
       (420, 'Assens'),
       (151, 'Ballerup'),
       (530, 'Billund'),
       (400, 'Bornholm'),
       (153, 'Brøndby'),
       (810, 'Brønderslev'),
       (155, 'Dragør'),
       (240, 'Egedal'),
       (561, 'Esbjerg'),
       (563, 'Fanø'),
       (710, 'Favrskov'),
       (320, 'Faxe'),
       (210, 'Fredensborg'),
       (607, 'Fredericia'),
       (147, 'Frederiksberg'),
       (813, 'Frederikshavn'),
       (250, 'Frederikssund'),
       (190, 'Furesø'),
       (430, 'Faaborg-Midtfyn'),
       (157, 'Gentofte'),
       (159, 'Gladsaxe'),
       (161, 'Glostrup'),
       (253, 'Greve'),
       (270, 'Gribskov'),
       (376, 'Guldborgsund'),
       (510, 'Haderslev'),
       (260, 'Halsnæs'),
       (766, 'Hedensted'),
       (217, 'Helsingør'),
       (163, 'Herlev'),
       (657, 'Herning'),
       (219, 'Hillerød'),
       (860, 'Hjørring'),
       (316, 'Holbæk'),
       (661, 'Holstebro'),
       (615, 'Horsens'),
       (167, 'Hvidovre'),
       (169, 'Høje-Taastrup'),
       (223, 'Hørsholm'),
       (756, 'Ikast-Brande'),
       (183, 'Ishøj'),
       (849, 'Jammerbugt'),
       (326, 'Kalundborg'),
       (440, 'Kerteminde'),
       (621, 'Kolding'),
       (101, 'København'),
       (259, 'Køge'),
       (482, 'Langeland'),
       (350, 'Lejre'),
       (665, 'Lemvig'),
       (360, 'Lolland'),
       (173, 'Lyngby-Taarbæk'),
       (825, 'Læsø'),
       (846, 'Mariagerfjord'),
       (410, 'Middelfart'),
       (773, 'Morsø'),
       (707, 'Norddjurs'),
       (480, 'Nordfyns'),
       (450, 'Nyborg'),
       (370, 'Næstved'),
       (727, 'Odder'),
       (461, 'Odense'),
       (306, 'Odsherred'),
       (730, 'Randers'),
       (840, 'Rebild'),
       (760, 'Ringkøbing-Skjern'),
       (329, 'Ringsted'),
       (265, 'Roskilde'),
       (230, 'Rudersdal'),
       (175, 'Rødovre'),
       (741, 'Samsø'),
       (740, 'Silkeborg'),
       (746, 'Skanderborg'),
       (779, 'Skive'),
       (330, 'Slagelse'),
       (269, 'Solrød'),
       (340, 'Sorø'),
       (336, 'Stevns'),
       (671, 'Struer'),
       (479, 'Svendborg'),
       (706, 'Syddjurs'),
       (540, 'Sønderborg'),
       (787, 'Thisted'),
       (550, 'Tønder'),
       (185, 'Tårnby'),
       (187, 'Vallensbæk'),
       (573, 'Varde'),
       (575, 'Vejen'),
       (630, 'Vejle'),
       (820, 'Vesthimmerland'),
       (791, 'Viborg'),
       (390, 'Vordingborg'),
       (492, 'Ærø'),
       (580, 'Aabenraa'),
       (851, 'Aalborg'),
       (751, 'Aarhus');


\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** adgangsadresser - takes some time *************************************'
\echo '***************************************************************************'
\echo ''
\echo '***** Creating adgangsadresse table'
DROP TABLE IF EXISTS adgangsadresser;
CREATE TABLE IF NOT EXISTS adgangsadresser (
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
  kn100mdk CHAR(15) NULL,
  kn1kmdk CHAR(15) NULL,
  kn10kmdk CHAR(15) NULL,
  adressepunktaendringsdato TIMESTAMP NULL,
  geom geometry
);
CREATE INDEX ON Adgangsadresser USING GIST (geom);
CREATE INDEX ON Adgangsadresser(ejerlavkode);
CREATE INDEX ON Adgangsadresser(wgs84lat);
CREATE INDEX ON Adgangsadresser(wgs84long);
CREATE INDEX ON Adgangsadresser(vejkode, kommunekode);
CREATE INDEX ON adgangsadresser(postnr);

\echo '\n***** Loading adgangsadresse data'
\COPY adgangsadresser (id, version, bygningsnavn, kommunekode, vejkode, vejnavn, husnr, supplerendebynavn, postnr, postnrnavn, ejerlavkode, ejerlavnavn, matrikelnr, esrejendomsnr, oprettet, ikraftfra, aendret, etrs89oest, etrs89nord, wgs84lat, wgs84long, noejagtighed, kilde, tekniskstandard, tekstretning, kn100mdk, kn1kmdk, kn10kmdk, adressepunktaendringsdato) from  program 'gunzip -c :DATADIR:/AddressAccess.csv.gz | sed -f :SCRIPTDIR:/replaceDoubleQuotes.sed' WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');



\echo '\n***** Updating wgs84 and geom columns'
UPDATE adgangsadresser SET wgs84 = ST_GeometryFromText('POINT('||wgs84lat||' '||wgs84long||')', 4326)
WHERE wgs84lat IS NOT NULL AND wgs84long IS NOT NULL;

UPDATE Adgangsadresser SET geom = wgs84::geometry;

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

\echo '\n***** Loading enhedsadresser data'
\COPY enhedsadresser (id, version, adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer) from program 'gunzip -c :DATADIR:/AddressSpecific.csv.gz' WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

\echo '\n***** Populate text search column'

create temp table tmp  AS select id,
                                 to_tsvector('vejnavne', coalesce(etage, '') || ' ' || coalesce(doer, '') || ' '
                                             || coalesce(postnrnavn, '') || ' ' || coalesce(vejnavn, '') ||  ' '
                                             || coalesce(to_char(postnr,'0000'), '') || ' ' || coalesce(husnr, ''))
         AS tsv
  FROM (SELECT e.id, etage, doer, p.navn as postnrnavn, v.vejnavn, p.nr as postnr, husnr
        FROM enhedsadresser e
        LEFT JOIN adgangsadresser a ON a.id = e.adgangsadresseid
        LEFT JOIN vejnavne v ON a.vejkode = v.kode AND a.kommunekode = v.kommunekode
        LEFT JOIN postnumre p ON  a.postnr = p.nr) as T;

UPDATE enhedsadresser AS e SET tsv = T.tsv from (select * from tmp) as T where e.id = T.id;

DROP TABLE tmp;


\echo ''
\echo ''
\echo '***************************************************************************'
\echo '*** adresser view *********************************************************'
\echo '***************************************************************************'
\echo ''

DROP VIEW IF EXISTS adresser;
CREATE VIEW adresser AS
SELECT
       E.id        AS id,
       E.id        AS enhedsadresseid,
       E.version   AS e_version,
       E.oprettet  AS e_oprettet,
       E.ikraftfra AS e_ikraftfra,
       E.aendret   AS e_aendret,
       E.tsv       AS tsv,
       E.etage,
       E.doer,

       A.id AS adgangsadresseid,
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
       A.geom       AS wgs84geom,
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
       K.navn AS kommunenavn

FROM enhedsadresser E
LEFT JOIN adgangsadresser A  ON (E.adgangsadresseid = A.id)
LEFT JOIN Vejnavne        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
LEFT JOIN Kommuner        AS K   ON (A.kommunekode = K.kode)
LEFT JOIN ejerlav         AS LAV ON (A.ejerlavkode = LAV.kode);

DROP VIEW IF EXISTS Vejnavnnavne;
CREATE VIEW Vejnavnnavne AS SELECT DISTINCT vejnavn,tsv FROM Vejnavne;

\echo '\n***** Bootstrap complete!'
