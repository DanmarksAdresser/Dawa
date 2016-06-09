DROP TYPE IF EXISTS bebyggelsestype CASCADE;
CREATE TYPE bebyggelsestype AS ENUM('by', 'bydel', 'spredtBebyggelse', 'sommerhusområde', 'sommerhusområdedel', 'industriområde', 'kolonihave', 'storby');

DROP TABLE IF EXISTS bebyggelser;
CREATE TABLE bebyggelser(
  id uuid PRIMARY KEY,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  kode integer,
  type bebyggelsestype NOT NULL,
  navn text NOT NULL,
  tsv tsvector,
  geom geometry(MultiPolygon, 25832)
);

CREATE INDEX ON bebyggelser USING GIN(tsv);

DROP TABLE IF EXISTS bebyggelser_adgadr;
CREATE TABLE bebyggelser_adgadr(
  bebyggelse_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL,
  PRIMARY KEY(bebyggelse_id, adgangsadresse_id)
);

-- Covering index for better performance
CREATE INDEX ON bebyggelser_adgadr(adgangsadresse_id, bebyggelse_id);

DROP TABLE IF EXISTS bebyggelser_adgadr_history;
CREATE TABLE bebyggelser_adgadr_history(
  valid_from integer,
  valid_to integer,
  bebyggelse_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL
);

CREATE INDEX ON bebyggelser_adgadr_history(valid_from);
CREATE INDEX ON bebyggelser_adgadr_history(valid_to);
CREATE INDEX ON bebyggelser_adgadr_history(adgangsadresse_id);
CREATE INDEX ON bebyggelser_adgadr_history(bebyggelse_id, adgangsadresse_id);



DROP TABLE IF EXISTS bebyggelser_divided;
CREATE TABLE bebyggelser_divided(
  id uuid,
  geom geometry(MultiPolygon, 25832)
);

CREATE INDEX ON bebyggelser_divided(id);
CREATE INDEX ON bebyggelser_divided USING GIST(geom);
