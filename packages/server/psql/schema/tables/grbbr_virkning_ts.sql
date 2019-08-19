DROP TABLE IF EXISTS grbbr_virkning_ts;

CREATE TABLE grbbr_virkning_ts
(
    prev_virkning timestamptz,
    virkning timestamptz
);

INSERT INTO grbbr_virkning_ts(prev_virkning, virkning)values (now(), now());

CREATE UNIQUE INDEX
    ON grbbr_virkning_ts ((TRUE));
