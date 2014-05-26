DROP TABLE IF EXISTS enhedsadresser;
CREATE TABLE IF NOT EXISTS enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamptz,
  ikraftfra timestamptz,
  aendret timestamptz,
  etage VARCHAR(3),
  doer VARCHAR(4),
  tsv tsvector
);
CREATE INDEX ON enhedsadresser(adgangsadresseid);
CREATE INDEX ON enhedsadresser USING gin(tsv);
CREATE INDEX ON enhedsadresser(etage, id);
CREATE INDEX ON enhedsadresser(doer, id);

DROP TABLE IF EXISTS enhedsadresser_history;
CREATE TABLE IF NOT EXISTS enhedsadresser_history (
  valid_from integer,
  valid_to integer,
  id uuid NOT NULL,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamptz,
  ikraftfra timestamptz,
  aendret timestamptz,
  etage VARCHAR(3),
  doer VARCHAR(4)
);

CREATE INDEX ON enhedsadresser_history(valid_to);
CREATE INDEX ON enhedsadresser_history(valid_from);
CREATE INDEX ON enhedsadresser_history(id);

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
         setweight(to_tsvector('adresser', COALESCE(etage, '') ||' ' || COALESCE(doer, '')), 'B') as tsv
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
                                          COALESCE(NEW.etage, '') || ' ' ||
                                          COALESCE(NEW.doer, '')), 'B')
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