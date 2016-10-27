DROP MATERIALIZED VIEW jordstykker CASCADE;

CREATE TABLE jordstykker(
  ejerlavkode integer not null,
  matrikelnr text not null,
  kommunekode smallint,
  sognekode smallint,
  regionskode smallint,
  retskredskode smallint,
  esrejendomsnr text,
  sfeejendomsnr text,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  primary key(ejerlavkode, matrikelnr),
  geom geometry(Polygon, 25832)
);

CREATE INDEX ON jordstykker(matrikelnr);
CREATE INDEX ON jordstykker(kommunekode);
CREATE INDEX ON jordstykker(sognekode);
CREATE INDEX ON jordstykker(retskredskode);
CREATE INDEX ON jordstykker(esrejendomsnr);
CREATE INDEX ON jordstykker(sfeejendomsnr);
CREATE INDEX ON jordstykker USING GIST(geom);

DROP TABLE IF EXISTS jordstykker_adgadr CASCADE;
CREATE TABLE jordstykker_adgadr(
  ejerlavkode integer not null,
  matrikelnr text not null,
  adgangsadresse_id uuid not null,
  primary key(ejerlavkode, matrikelnr, adgangsadresse_id)
);

-- Covering index for better performance
CREATE INDEX ON jordstykker_adgadr(adgangsadresse_id, ejerlavkode, matrikelnr);

DROP TABLE IF EXISTS jordstykker_adgadr_history CASCADE;
CREATE TABLE jordstykker_adgadr_history(
  valid_from integer,
  valid_to integer,
  ejerlavkode integer not null,
  matrikelnr text not null,
  adgangsadresse_id uuid not null
);

CREATE INDEX ON jordstykker_adgadr_history(valid_from);
CREATE INDEX ON jordstykker_adgadr_history(valid_to);
CREATE INDEX ON jordstykker_adgadr_history(adgangsadresse_id);
CREATE INDEX ON jordstykker_adgadr_history(ejerlavkode, matrikelnr, adgangsadresse_id);

INSERT INTO jordstykker(ejerlavkode, matrikelnr, kommunekode, sognekode, regionskode,
                        retskredskode, esrejendomsnr, sfeejendomsnr,
                        ændret, geo_version, geo_ændret, geom)
  (SELECT (temaer.fields->>'ejerlavkode')::integer,
     (temaer.fields->>'matrikelnr')::text,
     (temaer.fields->>'kommunekode')::smallint,
     (temaer.fields->>'sognekode')::smallint,
     (temaer.fields->>'regionskode')::smallint,
     (temaer.fields->>'retskredskode')::smallint,
     (temaer.fields->>'esrejendomsnr')::text,
     (temaer.fields->>'sfeejendomsnr')::text,
    aendret, geo_version, geo_aendret, ST_GeometryN(geom, 1)
   from temaer where tema = 'jordstykke');

INSERT INTO jordstykker_adgadr(ejerlavkode, matrikelnr, adgangsadresse_id)
  (SELECT
     (temaer.fields->>'ejerlavkode')::integer,
     (temaer.fields->>'matrikelnr')::text,
  adgangsadresse_id FROM adgangsadresser_temaer_matview at
    JOIN temaer ON at.tema_id = temaer.id WHERE at.tema = 'jordstykke');

INSERT INTO jordstykker_adgadr_history(valid_from, valid_to, ejerlavkode, matrikelnr, adgangsadresse_id)
  (SELECT
    valid_from, valid_to,
     (temaer.fields->>'ejerlavkode')::integer,
     (temaer.fields->>'matrikelnr')::text,
     adgangsadresse_id FROM adgangsadresser_temaer_matview_history at
    JOIN temaer ON at.tema_id = temaer.id WHERE at.tema = 'jordstykke');

SET SESSION_REPLICATION_ROLE ='replica';

DELETE FROM temaer WHERE tema = 'jordstykke';
DELETE FROM gridded_temaer_matview where tema = 'jordstykke';
DELETE FROM adgangsadresser_temaer_matview where tema = 'jordstykke';
DELETE FROM adgangsadresser_temaer_matview_history where tema = 'jordstykke';
WITH txids AS ((SELECT valid_from  as txid FROM jordstykker_adgadr_history) UNION (SELECT valid_to as txid FROM jordstykker_adgadr_history))
UPDATE transaction_history SET entity = 'jordstykketilknytning' FROM txids WHERE txid = sequence_number;
SET SESSION_REPLICATION_ROLE ='origin';

CREATE TABLE dar1_transaction (
  id             INTEGER       NOT NULL PRIMARY KEY,
  ts             TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source         text NOT NULL,
  dawa_seq_range INT4RANGE     NOT NULL
);

CREATE INDEX ON dar1_transaction (ts);

CREATE TABLE dar1_meta(
  current_tx INTEGER, -- ID of currently executing transaction
  last_event_id INTEGER, -- Last event id which has been fetched and stored
  virkning timestamptz, -- Current virkning time for computing actual state for DAWA tables
  prev_virkning timestamptz -- Previous virkning time for computing actual state for DAWA tables
);

INSERT INTO dar1_meta VALUES(NULL, NULL, NULL);

CREATE UNIQUE INDEX
  ON dar1_meta ((TRUE));
