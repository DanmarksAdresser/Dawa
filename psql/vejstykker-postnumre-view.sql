
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS VejstykkerPostnumreMat CASCADE;
CREATE TABLE VejstykkerPostnumreMat(
  kommunekode INTEGER,
  vejkode INTEGER,
  postnr INTEGER
);

INSERT INTO VejstykkerPostnumreMat SELECT DISTINCT kommunekode, vejkode, postnr FROM adgangsadresser;

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
        END IF;
      END IF;
      RETURN NULL;
    END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vejstykker_postnumre_mat ON adgangsadresser;
CREATE TRIGGER update_vejstykker_postnumre_mat AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE update_vejstykker_postnumre_mat();

CREATE UNIQUE INDEX ON VejstykkerPostnumreMat(postnr, kommunekode, vejkode);
CREATE INDEX ON vejstykkerpostnumremat(kommunekode, vejkode);
