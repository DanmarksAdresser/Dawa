BEGIN;
DROP TYPE IF EXISTS DagiTemaType CASCADE;
CREATE TYPE DagiTemaType AS ENUM ('kommune', 'region', 'sogn', 'opstillingskreds', 'politikreds', 'retskreds', 'afstemningsområde');

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
  geom  geometry(polygon, 25832),
  tsv tsvector,
  PRIMARY KEY(tema, kode)
);

CREATE INDEX ON DagiTemaer USING gist(geom);
CREATE INDEX ON DagiTemaer(navn);

DROP TABLE IF EXISTS AdgangsadresserDagiRel CASCADE;
CREATE TABLE AdgangsAdresserDagiRel(
  adgangsadresseid uuid not null,
  dagitema DagiTemaType not null,
  dagikode integer not null,
  primary key(adgangsadresseid, dagitema, dagikode)
);

CREATE INDEX ON AdgangsadresserDagiRel(dagiTema, dagiKode, adgangsadresseid);

CREATE OR REPLACE FUNCTION refresh_adgangsadresser_dagi_rel()
  RETURNS INTEGER AS
  $$
  BEGIN
    DELETE FROM AdgangsAdresserDagiRel;
    INSERT INTO AdgangsAdresserDagiRel (adgangsadresseid, dagitema, dagiKode)
      (SELECT
         Adgangsadresser.id,
         tema,
         kode
       FROM AdgangsAdresser, DagiTemaer
       WHERE ST_CONTAINS(DagiTemaer.geom,
                         AdgangsAdresser.geom));
    RETURN NULL;
  END;
  $$ LANGUAGE PLPGSQL;

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
      (SELECT
         Adgangsadresser.id,
         Dagitemaer.tema,
         Dagitemaer.kode
       FROM Adgangsadresser, Dagitemaer
       WHERE Adgangsadresser.id = NEW.id AND ST_Contains(Dagitemaer.geom, Adgangsadresser.geom));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_adgangsadresser_dagi_rel_dagitemaer()
  RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.geom = NEW.geom) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
  THEN
    DELETE FROM AdgangsadresserDagiRel WHERE dagiTema = OLD.tema AND dagiKode = OLD.kode;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    INSERT INTO AdgangsadresserDagiRel (adgangsadresseid, dagiTema, dagiKode)
      (SELECT
         Adgangsadresser.id,
         Dagitemaer.tema,
         Dagitemaer.kode
       FROM Adgangsadresser, Dagitemaer
       WHERE DagiTemaer.tema = NEW.tema AND
             DagiTemaer.kode = NEW.kode AND
             ST_Contains(Dagitemaer.geom,
                         Adgangsadresser.geom));
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
CREATE TRIGGER update_adgangsadresser_dagi_rel_dagitemaer AFTER INSERT OR UPDATE OR DELETE ON DagiTemaer
FOR EACH ROW EXECUTE PROCEDURE update_adgangsadresser_dagi_rel_dagitemaer();

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
    array_to_json((select array_agg(DISTINCT CAST((D.tema, D.kode, D.navn) AS DagiTemaRef)) FROM AdgangsadresserDagiRel DR JOIN DagiTemaer D  ON (D.tema = DR.dagiTema AND D.kode = DR.dagiKode))) AS dagitemaer,
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

DROP TABLE Kommuner CASCADE;
COMMIT;