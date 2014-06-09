-- Init function
DROP FUNCTION IF EXISTS adgangsadresser_init_tsv() CASCADE;
CREATE FUNCTION adgangsadresser_init_tsv()
  RETURNS VOID LANGUAGE SQL AS
  $$
  UPDATE adgangsadresser
  SET tsv = newtsvs.tsv
  FROM
    (select adgangsadresser.id, setweight(vejstykker.tsv, 'A') || setweight(to_tsvector('adresser', husnr), 'A') ||
                                setweight(to_tsvector('adresser', COALESCE(supplerendebynavn, '')), 'C') ||
                                setweight(postnumre.tsv, 'D') AS tsv FROM adgangsadresser left join postnumre on adgangsadresser.postnr = postnumre.nr
      left join vejstykker ON adgangsadresser.kommunekode = vejstykker.kommunekode and adgangsadresser.vejkode = vejstykker.kode) as newtsvs
  WHERE
      adgangsadresser.id = newtsvs.id and adgangsadresser.tsv is distinct from newtsvs.tsv;
  $$;

DROP FUNCTION IF EXISTS adgangsadresser_init() CASCADE;
CREATE FUNCTION adgangsadresser_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    PERFORM adgangsadresser_init_tsv();
    UPDATE adgangsadresser SET geom = ST_SetSRID(ST_MakePoint(etrs89oest, etrs89nord), 25832);
  END;
$$;

DROP FUNCTION IF EXISTS adgangsadresser_refresh_tsv(uuid[]) CASCADE;
CREATE OR REPLACE FUNCTION adgangsadresser_refresh_tsv(uuids uuid[])
  RETURNS VOID
LANGUAGE plpgsql AS
  $$
  BEGIN
    UPDATE adgangsadresser
    SET tsv = setweight(vejstykker.tsv, 'A') || setweight(to_tsvector('adresser', husnr), 'A') ||
              setweight(to_tsvector('adresser', COALESCE(supplerendebynavn, '')), 'C') ||
              setweight(postnumre.tsv, 'D')
    FROM
      postnumre, vejstykker
    WHERE
      postnumre.nr = adgangsadresser.postnr AND vejstykker.kommunekode = adgangsadresser.kommunekode AND
      vejstykker.kode = adgangsadresser.vejkode AND adgangsadresser.id = ANY (uuids);
  END;
  $$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION adgangsadresser_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = (SELECT setweight(vejstykker.tsv, 'A') || setweight(to_tsvector('adresser', NEW.husnr), 'A') ||
            setweight(to_tsvector('adresser', COALESCE(NEW.supplerendebynavn, '')), 'C') ||
            setweight(postnumre.tsv, 'D')
  FROM
  postnumre, vejstykker
  WHERE
  postnumre.nr = NEW.postnr AND vejstykker.kommunekode = NEW.kommunekode AND
  vejstykker.kode = NEW.vejkode);
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER adgangsadresser_tsv_update BEFORE INSERT OR UPDATE
ON adgangsadresser FOR EACH ROW EXECUTE PROCEDURE
  adgangsadresser_tsv_update();


-- Triggers which maintains the tsv column when vejstykke changes
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update_on_vejstykke() CASCADE;
CREATE OR REPLACE FUNCTION adgangsadresser_tsv_update_on_vejstykke()
  RETURNS TRIGGER AS $$
BEGIN
  PERFORM adgangsadresser_refresh_tsv((SELECT array_agg(id) FROM adgangsadresser WHERE adgangsadresser.vejkode = NEW.kode AND adgangsadresser.kommunekode = NEW.kommunekode));
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER adgangsadresser_tsv_update_on_vejstykke AFTER INSERT OR UPDATE
ON vejstykker FOR EACH ROW EXECUTE PROCEDURE
  adgangsadresser_tsv_update_on_vejstykke();

-- Triggers which maintains the tsv column when postnummer changes
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update_on_postnummer() CASCADE;
CREATE OR REPLACE FUNCTION adgangsadresser_tsv_update_on_postnummer()
  RETURNS TRIGGER AS $$
BEGIN
  PERFORM adgangsadresser_refresh_tsv((SELECT array_agg(id) FROM adgangsadresser WHERE adgangsadresser.postnr = NEW.nr));
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER adgangsadresser_tsv_update_on_postnummer AFTER INSERT OR UPDATE
ON postnumre FOR EACH ROW EXECUTE PROCEDURE
  adgangsadresser_tsv_update_on_postnummer();