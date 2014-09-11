DROP TABLE IF EXISTS adgangsadresser_temaer_matview CASCADE;
CREATE TABLE adgangsadresser_temaer_matview(
  adgangsadresse_id uuid not null,
  tema tema_type not null,
  tema_id integer not null,
  primary key(adgangsadresse_id, tema, tema_id)
);

CREATE INDEX ON adgangsadresser_temaer_matview(tema, tema_id, adgangsadresse_id);
CREATE UNIQUE INDEX ON adgangsadresser_temaer_matview(tema, adgangsadresse_id);