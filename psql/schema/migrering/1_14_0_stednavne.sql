DROP TABLE IF EXISTS stednavne CASCADE;
DROP TABLE IF EXISTS stednavne_adgadr CASCADE;
DROP TABLE IF EXISTS stednavne_adgadr_history CASCADE;
DROP TABLE IF EXISTS stednavne_divided CASCADE;
DROP TABLE IF EXISTS stednavne_changes CASCADE;

CREATE TABLE stednavne(
  id uuid PRIMARY KEY,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  hovedtype text NOT NULL,
  undertype text NOT NULL,
  navn text NOT NULL,
  navnestatus text not null,
  bebyggelseskode integer,
  tsv tsvector,
  visueltcenter geometry(point, 25832),
  geom geometry(geometry, 25832)
);

CREATE INDEX ON stednavne USING GIN(tsv);
CREATE INDEX ON stednavne(navn);
CREATE INDEX ON stednavne(hovedtype, undertype);
CREATE INDEX ON stednavne(undertype);

CREATE TABLE stednavne_changes as (SELECT null::integer as txid, null::integer as changeid, null::operation_type as operation, null::boolean as public, stednavne.* FROM stednavne WHERE false);
ALTER TABLE stednavne_changes ALTER COLUMN txid SET NOT NULL;
ALTER TABLE stednavne_changes ALTER COLUMN operation SET NOT NULL;
ALTER TABLE stednavne_changes ALTER COLUMN public SET NOT NULL;
CREATE INDEX ON stednavne_changes(txid, operation);
CREATE INDEX ON stednavne_changes(changeid, public);

CREATE TABLE stednavne_adgadr(
  stednavn_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL,
  PRIMARY KEY(stednavn_id, adgangsadresse_id)
);

-- Covering index for better performance
CREATE INDEX ON stednavne_adgadr(adgangsadresse_id, stednavn_id);

CREATE TABLE stednavne_adgadr_history(
  valid_from integer,
  valid_to integer,
  stednavn_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL
);

CREATE INDEX ON stednavne_adgadr_history(valid_from);
CREATE INDEX ON stednavne_adgadr_history(valid_to);
CREATE INDEX ON stednavne_adgadr_history(adgangsadresse_id);
CREATE INDEX ON stednavne_adgadr_history(stednavn_id, adgangsadresse_id);

CREATE TABLE stednavne_divided(
  id uuid,
  geom geometry(geometry, 25832)
);

CREATE INDEX ON stednavne_divided(id);
CREATE INDEX ON stednavne_divided USING GIST(geom);

DROP MATERIALIZED VIEW IF EXISTS stednavn_kommune;
CREATE MATERIALIZED VIEW stednavn_kommune AS
  (SELECT distinct s.id as stednavn_id, k.kode as kommunekode
   FROM stednavne_divided s JOIN gridded_temaer_matview g ON g.tema = 'kommune' AND st_intersects(s.geom, g.geom)
     JOIN kommuner k ON g.id = k.tema_id);

CREATE UNIQUE INDEX ON stednavn_kommune(stednavn_id, kommunekode);
CREATE  INDEX ON stednavn_kommune(kommunekode);
