CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

ALTER TABLE adgangsadresser DISABLE TRIGGER ALL;
ALTER TABLE Adgangsadresser ADD COLUMN objekttype smallint;
ALTER TABLE Adgangsadresser_history ADD COLUMN objekttype smallint;
UPDATE Adgangsadresser_history SET objekttype = 1;
UPDATE Adgangsadresser SET objekttype = 1;
ALTER TABLE adgangsadresser ENABLE TRIGGER ALL;


ALTER TABLE enhedsadresser DISABLE TRIGGER ALL;
ALTER TABLE Enhedsadresser ADD COLUMN objekttype smallint;
ALTER TABLE Enhedsadresser_history ADD COLUMN objekttype smallint;
UPDATE Enhedsadresser_history SET objekttype = 1;
UPDATE Enhedsadresser SET objekttype = 1;
ALTER TABLE enhedsadresser ENABLE TRIGGER ALL;

CREATE INDEX ON Adgangsadresser(objekttype);
CREATE INDEX ON Enhedsadresser(objekttype);