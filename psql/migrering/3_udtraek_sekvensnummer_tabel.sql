create table udtraek_sekvensnummer(
  sequence_number integer not null
);

CREATE UNIQUE INDEX udtraek_sekvensnummer_one_row
ON udtraek_sekvensnummer((true));
