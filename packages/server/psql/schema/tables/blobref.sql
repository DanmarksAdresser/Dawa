DROP TABLE IF EXISTS blobref;
CREATE TABLE blobref(
  blobid text PRIMARY KEY,
  txid integer,
  entity text,
  columnName text
);