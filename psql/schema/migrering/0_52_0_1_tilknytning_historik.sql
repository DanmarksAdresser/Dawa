CREATE TABLE adgangsadresser_temaer_matview_history(
  valid_from integer,
  valid_to integer,
  adgangsadresse_id uuid not null,
  tema tema_type not null,
  tema_id integer not null
);

CREATE INDEX ON adgangsadresser_temaer_matview_history(valid_from);
CREATE INDEX ON adgangsadresser_temaer_matview_history(valid_to);
CREATE INDEX ON adgangsadresser_temaer_matview_history(adgangsadresse_id, tema_id, tema);
CREATE INDEX ON adgangsadresser_temaer_matview_history(tema, valid_from);
CREATE INDEX ON adgangsadresser_temaer_matview_history(tema, valid_to);
CREATE INDEX ON adgangsadresser_temaer_matview_history(tema, tema_id);