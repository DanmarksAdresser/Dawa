DROP TABLE IF EXISTS postnumre CASCADE;
CREATE TABLE IF NOT EXISTS postnumre (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255),
  navn VARCHAR(20) NOT NULL,
  tsv tsvector,
  stormodtager boolean NOT NULL DEFAULT false
);

CREATE INDEX ON postnumre USING gin(tsv);
CREATE INDEX ON postnumre(navn);

DROP TABLE IF EXISTS postnumre_history CASCADE;
CREATE TABLE IF NOT EXISTS postnumre_history (
  valid_from integer,
  valid_to integer,
  nr integer,
  navn VARCHAR(20) NOT NULL,
  stormodtager boolean NOT NULL DEFAULT false
);

-- Init function
DROP FUNCTION IF EXISTS postnumre_init() CASCADE;
CREATE FUNCTION postnumre_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    UPDATE postnumre SET tsv = to_tsvector('adresser', coalesce(to_char(nr, '0000'), '') || ' ' || coalesce(navn, ''));
    NULL;
  END;
$$;

-- Trigger which maintains the tsv column
CREATE OR REPLACE FUNCTION postnumre_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', coalesce(to_char(NEW.nr, '0000'), '') || ' ' || coalesce(NEW.navn, ''));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER postnumre_tsv_update BEFORE INSERT OR UPDATE
ON postnumre FOR EACH ROW EXECUTE PROCEDURE
  postnumre_tsv_update();

-- Trigger to maintain history
DROP FUNCTION IF EXISTS postnumre_history_update() CASCADE;
CREATE OR REPLACE FUNCTION postnumre_history_update()
  RETURNS TRIGGER AS $$
DECLARE
  seqnum integer;
  optype operation_type;
BEGIN
  seqnum = (SELECT COALESCE((SELECT MAX(sequence_number) FROM transaction_history), 0) + 1);
  optype = lower(TG_OP);
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE postnumre_history SET valid_to = seqnum WHERE nr = OLD.nr AND valid_to IS NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    INSERT INTO postnumre_history(
      valid_from, nr, navn, stormodtager)
    VALUES (
      seqnum, NEW.nr, NEW.navn, NEW.stormodtager);
  END IF;
  INSERT INTO transaction_history(sequence_number, entity, operation) VALUES(seqnum, 'postnummer', optype);
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER postnumre_history_update AFTER INSERT OR UPDATE OR DELETE
ON postnumre FOR EACH ROW EXECUTE PROCEDURE
  postnumre_history_update();
