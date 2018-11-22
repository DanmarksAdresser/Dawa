DROP TABLE IF EXISTS dar_lastfetched;
CREATE TABLE dar_lastfetched(
  lastfetched timestamptz
);

INSERT INTO dar_lastfetched values(null);

-- Ensure table only contains a single value
CREATE UNIQUE INDEX ON dar_lastfetched((true));