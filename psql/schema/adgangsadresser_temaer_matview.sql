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
  IF TG_OP = 'DELETE' THEN
    DELETE FROM adgangsadresser_temaer_matview WHERE adgangsadresse_id = OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO adgangsadresser_temaer_matview (adgangsadresse_id, tema, tema_id)
      (SELECT DISTINCT
         Adgangsadresser.id,
         gridded_temaer_matview.tema,
         gridded_temaer_matview.id
       FROM Adgangsadresser, gridded_temaer_matview
       WHERE Adgangsadresser.id = NEW.id AND st_covers(gridded_temaer_matview.geom, Adgangsadresser.geom));
  ELSE
    DELETE FROM adgangsadresser_temaer_matview mv WHERE adgangsadresse_id = NEW.id AND NOT EXISTS(
        SELECT *
         FROM Adgangsadresser a, gridded_temaer_matview t
         WHERE mv.adgangsadresse_id = a.id  AND mv.tema_id = t.id and mv.tema = t.tema AND st_covers(t.geom, a.geom)
    );
    INSERT INTO adgangsadresser_temaer_matview
      (SELECT DISTINCT
         Adgangsadresser.id,
         gridded_temaer_matview.tema,
         gridded_temaer_matview.id
       FROM Adgangsadresser, gridded_temaer_matview
       WHERE Adgangsadresser.id = NEW.id AND
             st_covers(gridded_temaer_matview.geom, Adgangsadresser.geom) AND
      NOT EXISTS(
        SELECT * FROM adgangsadresser_temaer_matview atm WHERE
        atm.adgangsadresse_id = Adgangsadresser.id AND atm.tema = gridded_temaer_matview.tema AND
        atm.tema_id = gridded_temaer_matview.id
      ));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS adgangsadresser_temaer_matview_update_on_adgangsadresse ON adgangsadresser;
CREATE TRIGGER adgangsadresser_temaer_matview_update_on_adgangsadresse AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE adgangsadresser_temaer_matview_update_on_adgangsadresse();
