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
      valid_from, kommunekode, kode, oprettet, aendret, vejnavn)
    VALUES (
      seqnum, NEW.kommunekode, NEW.kode, NEW.oprettet, NEW.aendret, NEW.vejnavn);
  END IF;
  INSERT INTO transaction_history(sequence_number, entity, operation) VALUES(seqnum, 'vejstykke', optype);
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER vejstykker_history_update AFTER INSERT OR UPDATE OR DELETE
ON vejstykker FOR EACH ROW EXECUTE PROCEDURE
  vejstykker_history_update();

