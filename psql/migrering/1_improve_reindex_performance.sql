-- Init function
DROP FUNCTION IF EXISTS vejstykker_init() CASCADE;
CREATE FUNCTION vejstykker_init() RETURNS void
LANGUAGE sql AS
  $$
    UPDATE vejstykker SET tsv = to_tsvector('adresser', coalesce(vejnavn, '')) WHERE tsv IS DISTINCT FROM to_tsvector('adresser', coalesce(vejnavn, ''));
$$;

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