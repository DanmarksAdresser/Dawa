CREATE TABLE prim(
  id UUID primary key,
  name text,
  sec_id1 integer,
  sec_id2 integer,
  tert_id_part1 integer,
  tert_id_part2 integer
);

CREATE TABLE secondary (
  id integer primary key,
  name text
);

CREATE TABLE tertiary (
  id_part1 integer,
  id_part2 integer,
  name text not null,
  PRIMARY KEY(id_part1, id_part2)
);

CREATE TABLE primary_mat(
  id UUID primary key,
  prim_name text,
  sec_id1 integer,
  sec_id2 integer,
  sec_name1 text,
  sec_name2 text,
  tert_id_part1 integer,
  tert_id_part2 integer,
  tert_name text,
  derived text,
  nonpublic text
);

CREATE VIEW primary_mat_view AS (
  SELECT p.id,
    p.name as prim_name,
    sec_id1,
    sec_id2,
    s1.name as sec_name1,
    s2.name as sec_name2,
    tert_id_part1,
    tert_id_part2,
    t.name as tert_name,
    p.name || ' ' || s1.name || ' ' || s2.name || ' ' || t.name as derived
  FROM prim p LEFT JOIN secondary s1 ON p.sec_id1 = s1.id LEFT JOIN secondary s2 ON p.sec_id2 = s2.id
  JOIN tertiary t ON p.tert_id_part1 = t.id_part1 AND p.tert_id_part2 = t.id_part2
  WHERE t.name <> ''
);
