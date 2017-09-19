DROP TYPE IF EXISTS dar1_entity CASCADE;
CREATE TYPE dar1_entity AS
ENUM (
  'Adressepunkt',
  'Adresse',
  'DARAfstemningsområde',
  'DARKommuneinddeling',
  'DARMenighedsrådsafstemningsområde',
  'DARSogneinddeling',
  'Husnummer',
  'NavngivenVej',
  'NavngivenVejKommunedel',
  'NavngivenVejPostnummerRelation',
  'NavngivenVejSupplerendeBynavnRelation',
  'Postnummer',
  'SupplerendeBynavn'
);

DROP TABLE IF EXISTS dar1_changelog;
CREATE TABLE dar1_changelog(
  tx_id integer NOT NULL,
  entity dar1_entity NOT NULL,
  operation operation_type NOT NULL,
  rowkey integer NOT NULL
);
CREATE INDEX ON dar1_changelog(tx_id);
CREATE INDEX ON dar1_changelog(rowkey);

-- TODO possibly not helpful
--create index on adgangsadresser_changes(txid, id);

CREATE TABLE navngivenvej_changes as (SELECT null::integer as txid, null::integer as changeid, null::operation_type as operation, null::boolean as public, navngivenvej.* FROM navngivenvej WHERE false);
ALTER TABLE navngivenvej_changes ALTER COLUMN txid SET NOT NULL;
ALTER TABLE navngivenvej_changes ALTER COLUMN operation SET NOT NULL;
ALTER TABLE navngivenvej_changes ALTER COLUMN public SET NOT NULL;
CREATE INDEX ON navngivenvej_changes(txid, operation);
CREATE INDEX ON navngivenvej_changes(changeid, public);

CREATE TABLE navngivenvej_postnummer_changes as (SELECT null::integer as txid, null::integer as changeid, null::operation_type as operation, null::boolean as public, navngivenvej_postnummer.* FROM navngivenvej_postnummer WHERE false);
ALTER TABLE navngivenvej_postnummer_changes ALTER COLUMN txid SET NOT NULL;
ALTER TABLE navngivenvej_postnummer_changes ALTER COLUMN operation SET NOT NULL;
ALTER TABLE navngivenvej_postnummer_changes ALTER COLUMN public SET NOT NULL;
CREATE INDEX ON navngivenvej_postnummer_changes(txid, operation);
CREATE INDEX ON navngivenvej_postnummer_changes(changeid, public);

CREATE TABLE vejstykkerpostnumremat_changes as (SELECT null::integer as txid, null::integer as changeid, null::operation_type as operation, null::boolean as public, vejstykkerpostnumremat.* FROM vejstykkerpostnumremat WHERE false);
ALTER TABLE vejstykkerpostnumremat_changes ALTER COLUMN txid SET NOT NULL;
ALTER TABLE vejstykkerpostnumremat_changes ALTER COLUMN operation SET NOT NULL;
ALTER TABLE vejstykkerpostnumremat_changes ALTER COLUMN public SET NOT NULL;
CREATE INDEX ON vejstykkerpostnumremat_changes(txid, operation);
CREATE INDEX ON vejstykkerpostnumremat_changes(changeid, public);
