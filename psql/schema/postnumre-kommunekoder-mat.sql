DROP TABLE IF EXISTS postnumrekommunekodermat;
DROP TABLE IF EXISTS postnumre_kommunekoder_mat;
CREATE TABLE postnumre_kommunekoder_mat(
  postnr integer NOT NULL,
  kommunekode integer NOT NULL,
  PRIMARY KEY(postnr, kommunekode)
);

-- Triggers

-- Delete trigger
DROP FUNCTION IF EXISTS postnumre_kommunekoder_mat_trigger() CASCADE;
CREATE FUNCTION postnumre_kommunekoder_mat_trigger() RETURNS trigger
LANGUAGE plpgsql AS
$$
  DECLARE
    nr integer;
    kode integer;
  BEGIN
    IF TG_OP='UPDATE' OR TG_OP='DELETE'
    THEN
      nr := OLD.postnr;
      kode := OLD.kommunekode;
    ELSE
      nr := NEW.postnr;
      kode := NEW.kommunekode;
    END IF;

    DELETE FROM postnumre_kommunekoder_mat WHERE kommunekode = kode AND postnr = nr;

    INSERT INTO postnumre_kommunekoder_mat
    SELECT DISTINCT postnr, kommunekode FROM adgangsadresser WHERE postnr IS NOT NULL AND kommunekode = kode AND postnr = nr;

    RETURN NULL;
  END;
$$;

CREATE TRIGGER postnumre_kommunekoder_mat_trigger AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE postnumre_kommunekoder_mat_trigger();

-- Init function
DROP FUNCTION IF EXISTS postnumre_kommunekoder_mat_init() CASCADE;
CREATE FUNCTION postnumre_kommunekoder_mat_init() RETURNS void
LANGUAGE SQL AS
$$
INSERT INTO postnumre_kommunekoder_mat SELECT DISTINCT postnr, kommunekode FROM adgangsadresser WHERE postnr IS NOT NULL
$$;
