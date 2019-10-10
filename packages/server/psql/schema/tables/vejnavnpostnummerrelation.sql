DROP TABLE IF EXISTS vejnavnpostnummerrelation;
CREATE TABLE vejnavnpostnummerrelation
(
    postnr  smallint not null,
    vejnavn text     not null,
    postnrnavn text,
    betegnelse text,
    tsv TSVECTOR,
    geom    geometry(Geometry, 25832),
    primary key(postnr, vejnavn)
);

CREATE INDEX ON vejnavnpostnummerrelation USING GIN(tsv);
CREATE INDEX ON vejnavnpostnummerrelation USING GIST(vejnavn gist_trgm_ops);
CREATE INDEX ON vejnavnpostnummerrelation USING GIST(geom);
CREATE INDEX ON vejnavnpostnummerrelation(postnr, vejnavn);
