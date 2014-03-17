
\set ON_ERROR_STOP on
\set ECHO queries

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

DROP TABLE IF EXISTS postnumre CASCADE;
CREATE TABLE IF NOT EXISTS postnumre (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL,
  tsv tsvector,
  stormodtager boolean NOT NULL DEFAULT false
);

CREATE INDEX ON postnumre USING gin(tsv);
CREATE INDEX ON postnumre(navn);

DROP TABLE IF EXISTS stormodtagere;
CREATE TABLE IF NOT EXISTS stormodtagere (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL,
  adgangsadresseid UUID NOT NULL
);

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

DROP TABLE IF EXISTS enhedsadresser;
CREATE TABLE IF NOT EXISTS enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version timestamp NOT NULL,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp NOT NULL,
  etage VARCHAR(3),
  doer VARCHAR(4),
  tsv tsvector
);
CREATE INDEX ON enhedsadresser(adgangsadresseid);
CREATE INDEX ON enhedsadresser USING gin(tsv);
CREATE INDEX ON enhedsadresser(etage, id);
CREATE INDEX ON enhedsadresser(doer, id);

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

