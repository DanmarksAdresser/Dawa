DROP TABLE IF EXISTS vejstykker CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamp,
  aendret timestamp,
  vejnavn VARCHAR(255) NOT NULL,
  adresseringsnavn VARCHAR(255),
  tsv tsvector,
  PRIMARY KEY(kommunekode, kode)
);

CREATE INDEX ON vejstykker USING gin(tsv);
CREATE INDEX ON vejstykker(kode);

DROP TABLE IF EXISTS vejstykker_history CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker_history (
  valid_from integer,
  valid_to integer,
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamp,
  aendret timestamp,
  vejnavn VARCHAR(255) NOT NULL,
  adresseringsnavn VARCHAR(255)
);

CREATE INDEX ON vejstykker_history(valid_from);
CREATE INDEX ON vejstykker_history(valid_to);
CREATE INDEX ON vejstykker_history(kommunekode, kode);

-- Init function
DROP FUNCTION IF EXISTS vejstykker_init() CASCADE;
CREATE FUNCTION vejstykker_init() RETURNS void
LANGUAGE sql AS
$$
    UPDATE vejstykker SET tsv = to_tsvector('adresser', coalesce(vejnavn, '')) WHERE tsv IS DISTINCT FROM to_tsvector('adresser', coalesce(vejnavn, ''));
$$;

-- Trigger which maintains the tsv column
CREATE OR REPLACE FUNCTION vejstykker_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', coalesce(NEW.vejnavn, ''));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER vejstykker_tsv_update BEFORE INSERT OR UPDATE
ON vejstykker FOR EACH ROW EXECUTE PROCEDURE
  vejstykker_tsv_update();

-- Trigger to maintain history
DROP FUNCTION IF EXISTS vejstykker_history_update() CASCADE;
CREATE OR REPLACE FUNCTION vejstykker_history_update()
  RETURNS TRIGGER AS $$
DECLARE
  seqnum integer;
  optype operation_type;
BEGIN
  seqnum = (SELECT COALESCE((SELECT MAX(sequence_number) FROM transaction_history), 0) + 1);
  optype = lower(TG_OP);
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE vejstykker_history SET valid_to = seqnum WHERE kode = OLD.kode AND kommunekode = OLD.kommunekode AND valid_to IS NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    INSERT INTO vejstykker_history(
      valid_from, kommunekode, kode, vejnavn)
    VALUES (
      seqnum, NEW.kommunekode, NEW.kode, NEW.vejnavn);
  END IF;
  INSERT INTO transaction_history(sequence_number, entity, operation) VALUES(seqnum, 'vejstykke', optype);
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER vejstykker_history_update AFTER INSERT OR UPDATE OR DELETE
ON vejstykker FOR EACH ROW EXECUTE PROCEDURE
  vejstykker_history_update();
