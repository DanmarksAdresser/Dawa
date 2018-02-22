DROP TABLE IF EXISTS tilknytninger_mat CASCADE;
CREATE TABLE tilknytninger_mat(
  adgangsadresseid uuid primary key,
  kommunekode smallint,
  kommunenavn text,
  regionskode smallint,
  regionsnavn text,
  sognekode smallint,
  sognenavn text,
  retskredskode smallint,
  retskredsnavn text,
  politikredskode smallint,
  politikredsnavn text,
  opstillingskredskode smallint,
  opstillingskredsnavn text,
  zone smallint,
  valglandsdelsbogstav char(1),
  valglandsdelsnavn text,
  storkredsnummer smallint,
  storkredsnavn text
);

CREATE INDEX ON tilknytninger_mat(kommunekode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat(regionskode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat(sognekode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat(retskredskode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat(politikredskode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat(opstillingskredskode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat(valglandsdelsbogstav, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat(storkredsnummer, adgangsadresseid);

DROP TABLE IF EXISTS tilknytninger_mat_changes CASCADE;
CREATE TABLE tilknytninger_mat_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, tilknytninger_mat.* FROM tilknytninger_mat WHERE false);
CREATE INDEX ON tilknytninger_mat_changes(txid);
