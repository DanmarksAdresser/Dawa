-- No longer used, but make sure they are removed
DROP FUNCTION IF EXISTS update_vejstykker_postnumre_mat() CASCADE;
DROP FUNCTION IF EXISTS update_vejstykker_postnumre_mat_on_vejstykker() CASCADE;
DROP TRIGGER IF EXISTS update_vejstykker_postnumre_mat ON adgangsadresser;
DROP TRIGGER IF EXISTS update_vejstykker_postnumre_mat_on_vejstykker ON vejstykker;

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
