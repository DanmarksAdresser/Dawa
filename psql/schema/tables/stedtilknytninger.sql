DROP TABLE IF EXISTS stedtilknytninger CASCADE;
CREATE TABLE stedtilknytninger(
  stedid uuid NOT NULL,
  adgangsadresseid uuid NOT NULL,
  PRIMARY KEY(stedid, adgangsadresseid)
);

-- Covering index for better performance
CREATE INDEX ON stedtilknytninger(adgangsadresseid, stedid);