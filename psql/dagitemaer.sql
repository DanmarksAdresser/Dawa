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

-- Init function
DROP FUNCTION IF EXISTS dagitemaer_init() CASCADE;
CREATE FUNCTION dagitemaer_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    UPDATE dagitemaer SET tsv = to_tsvector('adresser', coalesce(navn, ''));
  END;
$$;

-- Trigger which maintains the tsv column
CREATE OR REPLACE FUNCTION dagitemaer_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', coalesce(NEW.navn, ''));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER dagitemaer_tsv_update BEFORE INSERT OR UPDATE
ON dagitemaer FOR EACH ROW EXECUTE PROCEDURE
  dagitemaer_tsv_update();