DROP TABLE IF EXISTS bbr_events CASCADE;

CREATE TABLE bbr_events(
  sekvensnummer integer NOT NULL,
  type varchar(255) NOT NULL,
  bbrTidspunkt timestamp NOT NULL,
  created timestamp NOT NULL,
  data json NOT NULL,
  PRIMARY KEY(sekvensnummer)
);

DROP FUNCTION IF EXISTS bbr_events_init() CASCADE;
CREATE FUNCTION bbr_events_init() RETURNS void
LANGUAGE plpgsql AS
  $$
  BEGIN
  END;
$$;
