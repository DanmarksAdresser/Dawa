DROP TABLE IF EXISTS adgangsadresser_temaer_matview CASCADE;
CREATE TABLE adgangsadresser_temaer_matview(
  adgangsadresse_id uuid not null,
  tema tema_type not null,
  tema_id integer not null,
  primary key(adgangsadresse_id, tema, tema_id)
);

CREATE INDEX ON adgangsadresser_temaer_matview(tema, tema_id, adgangsadresse_id);

DROP TABLE IF EXISTS adgangsadresser_temaer_matview_changes CASCADE;
CREATE TABLE adgangsadresser_temaer_matview_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, adgangsadresse_id, tema, tema_id FROM adgangsadresser_temaer_matview WHERE false);
CREATE INDEX ON adgangsadresser_temaer_matview_changes(adgangsadresse_id, tema, tema_id, changeid DESC NULLS LAST);
CREATE INDEX ON adgangsadresser_temaer_matview_changes(changeid DESC NULLS LAST);
CREATE INDEX ON adgangsadresser_temaer_matview_changes(txid);

DROP TABLE IF EXISTS adgangsadresser_temaer_matview_history CASCADE;