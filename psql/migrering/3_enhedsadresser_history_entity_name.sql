-- trigger to maintain history
DROP FUNCTION IF EXISTS enhedsadresser_history_update() CASCADE;
CREATE OR REPLACE FUNCTION enhedsadresser_history_update()
  RETURNS TRIGGER AS $$
DECLARE
  seqnum integer;
  optype operation_type;
BEGIN
  seqnum = (SELECT COALESCE((SELECT MAX(sequence_number) FROM transaction_history), 0) + 1);
  optype = lower(TG_OP);
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE enhedsadresser_history SET valid_to = seqnum WHERE id = OLD.id AND valid_to IS NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    INSERT INTO enhedsadresser_history(
      valid_from, id, adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer)
    VALUES (
      seqnum, NEW.id, NEW.adgangsadresseid, NEW.oprettet, NEW.ikraftfra, NEW.aendret, NEW.etage, NEW.doer);
  END IF;
  INSERT INTO transaction_history(sequence_number, entity, operation) VALUES(seqnum, 'adresse', optype);
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER enhedsadresser_history_update AFTER INSERT OR UPDATE OR DELETE
ON enhedsadresser FOR EACH ROW EXECUTE PROCEDURE
  enhedsadresser_history_update();

update transaction_history  set entity = 'adresse' where entity = 'enhedsadresse';