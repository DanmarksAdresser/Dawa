DROP TABLE IF EXISTS transaction_history CASCADE;
create table transaction_history(
  sequence_number integer not null primary key,
  time timestamptz not null DEFAULT CURRENT_TIMESTAMP(3),
  entity varchar(255) not null,
  operation operation_type not null,
  txid integer
);

create index on transaction_history(entity, time);
create index on transaction_history(entity, sequence_number);
create index on transaction_history(time);
CREATE INDEX ON transaction_history(txid, sequence_number);

DROP TABLE IF EXISTS bbr_sekvensnummer CASCADE;

create table bbr_sekvensnummer(
  sequence_number integer NOT NULL
);

INSERT INTO bbr_sekvensnummer VALUES (0);

CREATE UNIQUE INDEX
ON bbr_sekvensnummer((true));
