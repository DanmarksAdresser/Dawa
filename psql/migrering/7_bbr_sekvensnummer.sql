DROP TABLE transaction_history CASCADE;

create table bbr_sekvensnummer(
  sequence_number integer NOT NULL
);

INSERT INTO bbr_sekvensnummer VALUES (0);

CREATE UNIQUE INDEX
ON bbr_sekvensnummer((true));
