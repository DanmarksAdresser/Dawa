--CREATE DATABASE dawa;
--\c dawa;
--CREATE EXTENSION postgis;

CREATE TABLE IF NOT EXISTS Postnumre (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS Vejnavne (
  kode integer NOT NULL,
  kommunekode integer NOT NULL,
  version VARCHAR(255) NOT NULL,
  vejnavn VARCHAR(255) NOT NULL,
  PRIMARY KEY(kode, kommunekode)
);

CREATE TABLE IF NOT EXISTS Adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  vejkode INTEGER NOT NULL,
  kommunekode INTEGER NOT NULL,
  husnr VARCHAR(6) NOT NULL,
  postnr INTEGER,
  ejerlavkode INTEGER NOT NULL,
  ejerlavnavn VARCHAR(255) NULL,
  matrikelnr VARCHAR(7) NULL,
  oprettet VARCHAR(255) NULL,
  aendret VARCHAR(255) NULL,
  etrs89oest DECIMAL(7,2),
  etrs89nord DECIMAL(7,2),
  wgs84 GEOGRAPHY(POINT, 4326)
);

CREATE TABLE IF NOT EXISTS Enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  adgangsadresseid UUID NOT NULL,
  oprettet VARCHAR(255) NULL,
  aendret VARCHAR(255) NULL,
  etage VARCHAR(3),
  doer VARCHAR(4)
);


CREATE TABLE IF NOT EXISTS ejerlav (
  kode integer NOT NULL PRIMARY KEY,
  navn VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS kommuner (
  kode integer NOT NULL PRIMARY KEY,
  navn VARCHAR(20) NOT NULL
);

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

