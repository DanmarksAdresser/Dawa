DROP TABLE IF EXISTS ois_bygning;

CREATE TABLE ois_bygning (
  ois_id integer NOT NULL PRIMARY KEY,
  ois_ts timestamptz NOT NULL,
  Bygning_id uuid NOT NULL,
  Grund_id uuid,
  AdgAdr_id uuid,
  BYG_ANVEND_KODE smallint,
  OPFOERELSE_AAR smallint,
  OMBYG_AAR smallint,
  Landsejerlavkode integer,
  MatrNr text
);

CREATE TABLE ois_bygning_history (
  valid_from integer NOT NULL,
  valid_to integer NOT NULL,
  ois_id integer NOT NULL,
  ois_ts timestamptz NOT NULL,
  Bygning_id uuid NOT NULL,
  Grund_id uuid,
  AdgAdr_id uuid,
  BYG_ANVEND_KODE smallint,
  OPFOERELSE_AAR smallint,
  OMBYG_AAR smallint,
  Landsejerlavkode integer,
  MatrNr text
);