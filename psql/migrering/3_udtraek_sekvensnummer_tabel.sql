create table udtraek_sekvensnummer(
  sequence_number integer
);

INSERT INTO udtraek_sekvensnummer VALUES (null);

CREATE UNIQUE INDEX udtraek_sekvensnummer_one_row
ON udtraek_sekvensnummer((true));

