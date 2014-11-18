ALTER TABLE ejerlav ADD COLUMN tsv tsvector;
CREATE INDEX ejerlav_tsv ON ejerlav USING gin(tsv);
CREATE INDEX ejerlav_navn ON ejerlav(navn);
