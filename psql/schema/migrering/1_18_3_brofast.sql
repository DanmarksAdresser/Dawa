CREATE TABLE otilgang(
  sdfe_id integer PRIMARY KEY,
  gv_adgang_bro boolean,
  gv_adgang_faerge boolean,
  ikke_oe boolean,
  manually_checked text,
  geom geometry(point, 25832)
);

CREATE TABLE otilgang_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid,
                                    NULL::operation_type as operation, null::boolean as public,
                                    otilgang.* FROM otilgang WHERE false);
CREATE INDEX ON otilgang_changes(sdfe_id, txid desc NULLS LAST, changeid desc NULLS LAST);
CREATE INDEX ON otilgang_changes(changeid) WHERE public;
CREATE INDEX ON otilgang_changes(txid) ;

CREATE TABLE ikke_brofaste_oer(
  stednavn_id UUID PRIMARY KEY
);

CREATE TABLE ikke_brofaste_oer_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid,
                                         NULL::operation_type as operation, null::boolean as public,
                                    ikke_brofaste_oer.* FROM ikke_brofaste_oer WHERE false);
CREATE INDEX ON ikke_brofaste_oer_changes(stednavn_id, txid desc NULLS LAST, changeid desc NULLS LAST);
CREATE INDEX ON ikke_brofaste_oer_changes(changeid) WHERE public;
CREATE INDEX ON ikke_brofaste_oer_changes(txid) ;

CREATE TABLE ikke_brofaste_adresser(
  adgangsadresse_id UUID not null,
  stednavn_id UUID not null,
  PRIMARY KEY(adgangsadresse_id, stednavn_id)
);

CREATE TABLE ikke_brofaste_adresser_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid,
                                                  NULL::operation_type as operation, null::boolean as public,
                                             ikke_brofaste_adresser.* FROM ikke_brofaste_adresser WHERE false);
CREATE INDEX ON ikke_brofaste_adresser_changes(adgangsadresse_id,stednavn_id, txid desc NULLS LAST, changeid desc NULLS LAST);
CREATE INDEX ON ikke_brofaste_adresser_changes(changeid) WHERE public;
CREATE INDEX ON ikke_brofaste_adresser_changes(txid) ;
