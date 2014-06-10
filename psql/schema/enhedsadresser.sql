-- Init function
DROP FUNCTION IF EXISTS enhedsadresser_init() CASCADE;
CREATE FUNCTION enhedsadresser_init() RETURNS void
LANGUAGE sql AS
$$
    UPDATE enhedsadresser
    SET tsv = newtsvs.tsv
    FROM
      (SELECT enhedsadresser.id,
         adgangsadresser.tsv ||
         setweight(to_tsvector('adresser', processforindexing(COALESCE(etage, '') ||' ' || COALESCE(doer, ''))), 'B') as tsv
       FROM enhedsadresser left join adgangsadresser on enhedsadresser.adgangsadresseid = adgangsadresser.id) as newtsvs
    WHERE
      newtsvs.id = enhedsadresser.id and newtsvs.tsv is distinct from enhedsadresser.tsv;
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS enhedsadresser_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION enhedsadresser_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = (SELECT adgangsadresser.tsv ||
                    setweight(to_tsvector('adresser',
                                          processForIndexing(COALESCE(NEW.etage, '') || ' ' ||
                                          COALESCE(NEW.doer, ''))), 'B')
  FROM
  adgangsadresser
  WHERE
    adgangsadresser.id = NEW.adgangsadresseid);
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER enhedsadresser_tsv_update BEFORE INSERT OR UPDATE
ON enhedsadresser FOR EACH ROW EXECUTE PROCEDURE
  enhedsadresser_tsv_update();


-- Triggers which maintains the tsv column when adgangs changes
DROP FUNCTION IF EXISTS enhedsadresser_tsv_update_on_adgangsadresse() CASCADE;
CREATE OR REPLACE FUNCTION enhedsadresser_tsv_update_on_adgangsadresse()
  RETURNS TRIGGER AS $$
BEGIN
  UPDATE enhedsadresser
  SET tsv = NEW.tsv ||
            setweight(to_tsvector('adresser',
                                  processForIndexing(COALESCE(etage, '') || ' ' ||
                                  COALESCE(doer, ''))), 'B')
  WHERE
    adgangsadresseid = NEW.id;
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER enhedsadresser_tsv_update_on_adgangsadresse AFTER INSERT OR UPDATE
ON adgangsadresser FOR EACH ROW EXECUTE PROCEDURE
  enhedsadresser_tsv_update_on_adgangsadresse();