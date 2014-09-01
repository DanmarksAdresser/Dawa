DROP VIEW IF EXISTS Adresser CASCADE;
CREATE VIEW adresser AS
  SELECT
    E.id        AS e_id,
    E.objekttype AS e_objekttype,
    E.oprettet  AS e_oprettet,
    E.ikraftfra AS e_ikraftfra,
    E.aendret   AS e_aendret,
    E.tsv       AS e_tsv,
    E.etage,
    E.doer,
    A.*
  FROM enhedsadresser E
    LEFT JOIN adgangsadresserView A  ON (E.adgangsadresseid = A.a_id);

CREATE OR REPLACE FUNCTION adressebetegnelse(vejnavn VARCHAR, husnr VARCHAR, etage VARCHAR, dør VARCHAR, supplerendebynavn VARCHAR, postnr VARCHAR, postnrnavn VARCHAR)
  RETURNS varchar AS
  $$
  DECLARE
    betegnelse varchar;
  BEGIN
    betegnelse := COALESCE(vejnavn, '');
    IF husnr IS NOT NULL THEN
      betegnelse := betegnelse || ' ' || husnr;
    END IF;
    IF etage IS NOT NULL OR dør IS NOT NULL THEN
      betegnelse := betegnelse || ',';
      IF etage IS NOT NULL THEN
        betegnelse := betegnelse || ' ' || etage || '.';
      END IF;
      IF dør IS NOT NULL THEN
        betegnelse := betegnelse || ' ' || dør;
      END IF;
    END IF;
    betegnelse := betegnelse || ', ';
    IF supplerendebynavn IS NOT NULL THEN
      betegnelse := betegnelse || supplerendebynavn || ', ';
    END IF;
    IF postnr IS NOT NULL THEN
      betegnelse := betegnelse || postnr;
    END IF;
    IF postnrnavn IS NOT NULL THEN
      betegnelse := betegnelse || ' ' || postnrnavn;
    END IF;
    RETURN betegnelse;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;
