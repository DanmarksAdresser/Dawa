-- Init function
DROP FUNCTION IF EXISTS supplerendebynavne_init() CASCADE;
CREATE FUNCTION supplerendebynavne_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    DELETE FROM SupplerendeBynavne;
    INSERT INTO SupplerendeBynavne(supplerendebynavn, kommunekode, postnr)
      SELECT DISTINCT supplerendebynavn, kommunekode, postnr FROM Adgangsadresser
      WHERE supplerendebynavn IS NOT NULL and kommunekode IS NOT NULL and postnr IS NOT NULL;

    PERFORM supplerendebynavne_init_tsv();
    NULL;
  END;
$$;

-- Init function
DROP FUNCTION IF EXISTS supplerendebynavne_init_tsv() CASCADE;
CREATE FUNCTION supplerendebynavne_init_tsv() RETURNS void
LANGUAGE plpgsql AS
  $$
  BEGIN

    UPDATE SupplerendeBynavne SET tsv = to_tsvector('adresser', supplerendebynavn);
    NULL;
  END;
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS supplerendebynavne_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION supplerendebynavne_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', coalesce(NEW.supplerendebynavn, ''));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER supplerendebynavne_tsv_update BEFORE INSERT OR UPDATE
ON supplerendebynavne FOR EACH ROW EXECUTE PROCEDURE
  supplerendebynavne_tsv_update();

-- Triggers which maintains the supplerendebynavne table when adgangsadresser changes
DROP FUNCTION IF EXISTS supplerendebynavne_update_on_adgangsadresse() CASCADE;
CREATE OR REPLACE FUNCTION supplerendebynavne_update_on_adgangsadresse()
  RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.supplerendebynavn IS NOT NULL
  THEN
    IF NOT EXISTS(SELECT
                    *
                  FROM AdgangsAdresser
                  WHERE
                    supplerendebynavn = OLD.supplerendebynavn AND kommunekode = OLD.kommunekode AND postnr = OLD.postnr)
    THEN
      DELETE FROM Supplerendebynavne
      WHERE supplerendebynavn = OLD.supplerendebynavn AND kommunekode = OLD.kommunekode AND postnr = OLD.postnr;
    END IF;
  END IF;
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.supplerendebynavn IS NOT NULL AND NEW.kommunekode IS NOT NULL AND NEW.postnr IS NOT NULL
  THEN
    IF NOT EXISTS(SELECT
                    *
                  FROM Supplerendebynavne
                  WHERE
                    supplerendebynavn = NEW.supplerendebynavn AND kommunekode = NEW.kommunekode AND postnr = NEW.postnr)
    THEN
      INSERT INTO Supplerendebynavne (supplerendebynavn, kommunekode, postnr)
      VALUES (NEW.supplerendebynavn, NEW.kommunekode, NEW.postnr);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER supplerendebynavne_update_on_adgangsadresse AFTER INSERT OR UPDATE OR DELETE
ON adgangsadresser FOR EACH ROW EXECUTE PROCEDURE
  supplerendebynavne_update_on_adgangsadresse();

