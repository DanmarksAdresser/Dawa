-- Init function
DROP FUNCTION IF EXISTS adgangsadresser_temaer_matview_init() CASCADE;
CREATE FUNCTION adgangsadresser_temaer_matview_init() RETURNS void
LANGUAGE plpgsql AS
  $$
  BEGIN
    NULL;
  END;
$$;

DROP FUNCTION IF EXISTS adgangsadresser_temaer_matview_update_on_adgangsadresse() CASCADE;
CREATE FUNCTION adgangsadresser_temaer_matview_update_on_adgangsadresse()
  RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.geom = NEW.geom) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
  THEN
    DELETE FROM adgangsadresser_temaer_matview WHERE adgangsadresse_id = OLD.id;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    INSERT INTO adgangsadresser_temaer_matview (adgangsadresse_id, tema, tema_id)
      (SELECT DISTINCT
         Adgangsadresser.id,
         gridded_temaer_matview.tema,
         gridded_temaer_matview.id
       FROM Adgangsadresser, gridded_temaer_matview
       WHERE Adgangsadresser.id = NEW.id AND ST_Contains(gridded_temaer_matview.geom, Adgangsadresser.geom));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS adgangsadresser_temaer_matview_update_on_adgangsadresse ON adgangsadresser;
CREATE TRIGGER adgangsadresser_temaer_matview_update_on_adgangsadresse AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE adgangsadresser_temaer_matview_update_on_adgangsadresse();
