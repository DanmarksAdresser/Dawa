DROP TYPE IF EXISTS DagiTemaType CASCADE;
CREATE TYPE DagiTemaType AS ENUM ('kommune', 'region', 'sogn', 'opstillingskreds', 'politikreds', 'retskreds', 'afstemningsområde');

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
