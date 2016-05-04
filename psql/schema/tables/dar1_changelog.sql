DROP TABLE IF EXISTS dar1_changelog;

CREATE TABLE dar1_changelog(
  tx_id integer NOT NULL,
  entity dar1_entity NOT NULL,
  operation operation_type NOT NULL,
  rowkey integer NOT NULL
);

CREATE INDEX ON dar1_changelog(tx_id);
CREATE INDEX ON dar1_changelog(rowkey);
