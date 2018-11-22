DROP TABLE IF EXISTS bbr_events CASCADE;

CREATE TABLE bbr_events(
  sekvensnummer integer NOT NULL,
  type varchar(255) NOT NULL,
  bbrTidspunkt timestamptz NOT NULL,
  created timestamptz NOT NULL,
  sequence_number_from integer not null,
  sequence_number_to integer not null,
  data json NOT NULL,
  PRIMARY KEY(sekvensnummer)
);
