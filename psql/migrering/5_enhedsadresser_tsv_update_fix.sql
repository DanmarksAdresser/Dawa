-- Triggers which maintains the tsv column when adgangs changes
DROP FUNCTION IF EXISTS enhedsadresser_tsv_update_on_adgangsadresse() CASCADE;
CREATE OR REPLACE FUNCTION enhedsadresser_tsv_update_on_adgangsadresse()
  RETURNS TRIGGER AS $$
BEGIN
  UPDATE enhedsadresser
  SET tsv = NEW.tsv ||
            setweight(to_tsvector('adresser',
                                  COALESCE(etage, '') || ' ' ||
                                  COALESCE(doer, '')), 'B')
  WHERE
    adgangsadresseid = NEW.id;
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER enhedsadresser_tsv_update_on_adgangsadresse AFTER INSERT OR UPDATE
ON adgangsadresser FOR EACH ROW EXECUTE PROCEDURE
  enhedsadresser_tsv_update_on_adgangsadresse();
