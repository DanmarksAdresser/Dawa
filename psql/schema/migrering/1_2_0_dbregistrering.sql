ALTER TABLE dar_adgangspunkt ADD PRIMARY KEY(versionid);

ALTER TABLE dar_adgangspunkt ADD COLUMN dbregistrering tstzrange;
ALTER TABLE dar_husnummer ADD COLUMN dbregistrering tstzrange;
ALTER TABLE dar_adresse ADD COLUMN dbregistrering tstzrange;

CREATE INDEX ON dar_adgangspunkt(coalesce(upper(dbregistrering), lower(dbregistrering)));
CREATE INDEX ON dar_husnummer(coalesce(upper(dbregistrering), lower(dbregistrering)));
CREATE INDEX ON dar_adresse(coalesce(upper(dbregistrering), lower(dbregistrering)));
