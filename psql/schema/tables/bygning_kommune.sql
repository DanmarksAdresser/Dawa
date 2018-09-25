DROP TABLE IF EXISTS bygning_kommune CASCADE;

CREATE TABLE bygning_kommune(
  bygningid bigint,
  kommunekode smallint,
  primary key(bygningid, kommunekode)
);

CREATE UNIQUE INDEX ON bygning_kommune(kommunekode,bygningid);