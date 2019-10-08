CREATE TABLE vejnavnpostnummerrelation
(
    postnr  smallint not null,
    vejnavn text     not null,
    postnrnavn text,
    tsv TSVECTOR,
    geom    geometry(Geometry, 25832),
    primary key(postnr, vejnavn)
)