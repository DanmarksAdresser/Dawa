-- Init function
DROP FUNCTION IF EXISTS adgangsadresserdagirel_init() CASCADE;
CREATE FUNCTION adgangsadresserdagirel_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    NULL;
  END;
$$;

CREATE OR REPLACE FUNCTION adgangsadresserdagirel_update_on_adgangsadresse()
  RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.geom = NEW.geom) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
  THEN
    DELETE FROM AdgangsadresserDagiRel WHERE adgangsadresseid = OLD.id;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    INSERT INTO AdgangsadresserDagiRel (adgangsadresseid, dagiTema, dagiKode)
      (SELECT DISTINCT
         Adgangsadresser.id,
         GriddedDagitemaer.tema,
         GriddedDagitemaer.kode
       FROM Adgangsadresser, GriddedDagitemaer
       WHERE Adgangsadresser.id = NEW.id AND ST_Contains(GriddedDagitemaer.geom, Adgangsadresser.geom));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS adgangsadresserdagirel_update_on_adgangsadresse ON adgangsadresser;
CREATE TRIGGER adgangsadresserdagirel_update_on_adgangsadresse AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE adgangsadresserdagirel_update_on_adgangsadresse();
