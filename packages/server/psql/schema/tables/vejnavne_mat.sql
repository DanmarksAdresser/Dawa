DROP TABLE IF EXISTS vejnavne_mat CASCADE;
CREATE TABLE IF NOT EXISTS vejnavne_mat (
    navn text primary key,
    tsv tsvector
);

CREATE INDEX ON vejnavne_mat USING gin(tsv);
CREATE INDEX ON vejnavne_mat USING GIST(navn gist_trgm_ops);
