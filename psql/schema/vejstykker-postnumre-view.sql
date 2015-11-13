DROP FUNCTION IF EXISTS update_vejstykker_postnumre_mat() CASCADE;

CREATE FUNCTION update_vejstykker_postnumre_mat() RETURNS trigger AS $$
    BEGIN
        IF TG_OP='UPDATE' OR TG_OP='DELETE' THEN
          IF NOT EXISTS(SELECT * FROM adgangsadresser WHERE OLD.vejkode IS NOT DISTINCT FROM  vejkode AND OLD.kommunekode IS NOT DISTINCT FROM kommunekode AND OLD.postnr IS NOT DISTINCT FROM  postnr) THEN
            DELETE FROM VejstykkerPostnumreMat WHERE OLD.vejkode IS NOT DISTINCT FROM  vejkode AND OLD.kommunekode IS NOT DISTINCT FROM  kommunekode AND OLD.postnr IS NOT DISTINCT FROM  postnr;
          END IF;
        END IF;
      IF TG_OP='UPDATE' OR TG_OP='INSERT' THEN
        IF NOT EXISTS(SELECT * FROM VejstykkerPostnumreMat WHERE NEW.vejkode IS NOT DISTINCT FROM  vejkode AND NEW.kommunekode IS NOT DISTINCT FROM  kommunekode AND NEW.postnr IS NOT DISTINCT FROM  postnr) THEN
          INSERT INTO VejstykkerPostnumreMat(kommunekode, vejkode, postnr) VALUES (NEW.kommunekode, NEW.vejkode, NEW.postnr);
          UPDATE VejstykkerPostnumreMat vp
          SET tekst = COALESCE(vejnavn, '') || ' ' || to_char(postnr, 'FM0000') || ' ' || COALESCE(p.navn, '')
          FROM postnumre p, vejstykker v
          WHERE vp.kommunekode = v.kommunekode AND
                vp.vejkode = v.kode AND
                vp.postnr = p.nr AND
              NEW.vejkode = vp.vejkode AND
                NEW.kommunekode = vp.kommunekode AND
              new.postnr = vp.postnr;
        END IF;
      END IF;
      RETURN NULL;
    END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS update_vejstykker_postnumre_mat_on_vejstykker() CASCADE;

CREATE FUNCTION update_vejstykker_postnumre_mat_on_vejstykker() RETURNS trigger AS $$
    BEGIN
        UPDATE VejstykkerPostnumreMat vp
        SET tekst = COALESCE(NEW.vejnavn, '') || ' ' || to_char(postnr, 'FM0000') || ' ' || COALESCE(p.navn, '')
        FROM postnumre p
        WHERE vp.kommunekode = NEW.kommunekode AND
              vp.vejkode = NEW.kode AND
              vp.postnr = p.nr;
      RETURN NULL;
    END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS update_vejstykker_postnumre_mat ON adgangsadresser;
CREATE TRIGGER update_vejstykker_postnumre_mat AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE update_vejstykker_postnumre_mat();

DROP TRIGGER IF EXISTS update_vejstykker_postnumre_mat_on_vejstykker ON vejstykker;
CREATE TRIGGER update_vejstykker_postnumre_mat_on_vejstykker AFTER INSERT OR UPDATE ON vejstykker
FOR EACH ROW EXECUTE PROCEDURE update_vejstykker_postnumre_mat_on_vejstykker();
-- Init function
DROP FUNCTION IF EXISTS vejstykkerpostnumremat_init() CASCADE;
CREATE FUNCTION vejstykkerpostnumremat_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    DELETE FROM VejstykkerPostnumreMat;
    insert into vejstykkerpostnumremat(kommunekode, vejkode, postnr, tekst) (
    select distinct
      v.kommunekode,
      vejkode,
      postdistriktnummer as postnr,
      COALESCE(v.vejnavn, '') || ' ' || to_char(p.nr, 'FM0000') || ' ' || COALESCE(p.navn, '') as tekst
    from vejstykker v
      join dar_postnr on (v.kommunekode = dar_postnr.kommunekode and v.kode = dar_postnr.vejkode and
                          dar_postnr.ophoerttimestamp is null and upper(dar_postnr.registrering) is null)
      join postnumre p on postdistriktnummer = p.nr);
  END;
$$;
