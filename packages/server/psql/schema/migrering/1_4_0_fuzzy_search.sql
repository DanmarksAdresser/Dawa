ALTER DATABASE dawadb SET join_collapse_limit=10;
ALTER DATABASE dawadb SET from_collapse_limit=10;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

alter table vejstykkerpostnumremat add column tekst text;
CREATE INDEX ON vejstykkerpostnumremat USING GIST(tekst gist_trgm_ops);

CREATE INDEX ON vejstykker USING GIST(vejnavn gist_trgm_ops);