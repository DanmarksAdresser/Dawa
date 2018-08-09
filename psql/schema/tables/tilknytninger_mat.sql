DROP TABLE IF EXISTS tilknytninger_mat CASCADE;
CREATE TABLE tilknytninger_mat (
  adgangsadresseid                     UUID PRIMARY KEY,
  kommunekode                          SMALLINT,
  kommunenavn                          TEXT,
  regionskode                          SMALLINT,
  regionsnavn                          TEXT,
  sognekode                            SMALLINT,
  sognenavn                            TEXT,
  retskredskode                        SMALLINT,
  retskredsnavn                        TEXT,
  politikredskode                      SMALLINT,
  politikredsnavn                      TEXT,
  afstemningsområde_dagi_id            INTEGER,
  afstemningsområdenummer              SMALLINT,
  afstemningsområdenavn                TEXT,
  opstillingskredskode                 SMALLINT,
  opstillingskredsnavn                 TEXT,
  zone                                 SMALLINT,
  valglandsdelsbogstav                 CHAR(1),
  valglandsdelsnavn                    TEXT,
  storkredsnummer                      SMALLINT,
  storkredsnavn                        TEXT,
  menighedsrådsafstemningsområdenummer SMALLINT,
  menighedsrådsafstemningsområdenavn   TEXT
);

CREATE INDEX ON tilknytninger_mat (kommunekode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat (regionskode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat (sognekode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat (retskredskode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat (politikredskode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat (opstillingskredskode, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat (valglandsdelsbogstav, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat (storkredsnummer, adgangsadresseid);
CREATE INDEX ON tilknytninger_mat (kommunekode, afstemningsområdenummer);
CREATE INDEX ON tilknytninger_mat (afstemningsområdenummer);
CREATE INDEX ON tilknytninger_mat (afstemningsområde_dagi_id);
CREATE INDEX ON tilknytninger_mat (kommunekode, menighedsrådsafstemningsområdenummer, adgangsadresseid);

DROP TABLE IF EXISTS tilknytninger_mat_changes CASCADE;
CREATE TABLE tilknytninger_mat_changes AS (SELECT
                                             NULL :: INTEGER        AS txid,
                                             NULL :: INTEGER        AS changeid,
                                             NULL :: OPERATION_TYPE AS operation,
                                             NULL :: BOOLEAN        AS public,
                                             tilknytninger_mat.*
                                           FROM tilknytninger_mat
                                           WHERE FALSE);
CREATE INDEX ON tilknytninger_mat_changes (txid);
