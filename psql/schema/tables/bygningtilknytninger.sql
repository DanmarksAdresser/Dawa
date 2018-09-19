DROP TABLE IF EXISTS bygningtilknytninger CASCADE;
CREATE TABLE bygningtilknytninger(
  bygningid uuid NOT NULL,
  adgangsadresseid uuid NOT NULL,
  PRIMARY KEY(bygningid, adgangsadresseid)
);

-- Covering index for better performance
CREATE INDEX ON bygningtilknytninger(adgangsadresseid, bygningid);