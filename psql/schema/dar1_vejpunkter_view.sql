DROP VIEW IF EXISTS dar1_vejpunkter_view CASCADE;
CREATE VIEW dar1_vejpunkter_view AS
  SELECT
    ap.id,
    hn.id as husnummerid,
    ap.oprindelse_kilde as kilde,
    ap.oprindelse_nøjagtighedsklasse as noejagtighedsklasse,
    ap.oprindelse_tekniskstandard as tekniskstandard,
    ap.position as geom
  FROM dar1_adressepunkt_current ap
    JOIN dar1_husnummer_current hn ON ap.id = hn.vejpunkt_id
  WHERE hn.status IN (2,3);

DROP VIEW IF EXISTS dar1_vejpunkter_dirty_view CASCADE;
CREATE VIEW dar1_vejpunkter_dirty_view AS
  SELECT
    ap.id as id,
    ap.id as adressepunkt_id,
    hn.id as husnummer_id
  FROM dar1_adressepunkt_current ap
    JOIN dar1_husnummer_current hn ON ap.id = hn.vejpunkt_id
  WHERE  hn.status IN (2,3);
