DROP TYPE IF EXISTS operation_type CASCADE;
DROP TABLE IF EXISTS transaction_history CASCADE;
create type operation_type as enum('insert', 'update', 'delete');
create table transaction_history(
  sequence_number integer not null,
  time timestamp not null DEFAULT CURRENT_TIMESTAMP,
  entity varchar(255) not null,
  operation operation_type not null
);

DROP TABLE IF EXISTS udtraek_sekvensnummer CASCADE;

create table udtraek_sekvensnummer(
  sequence_number integer
);

INSERT INTO udtraek_sekvensnummer VALUES (null);

CREATE UNIQUE INDEX udtraek_sekvensnummer_one_row
ON udtraek_sekvensnummer((true));

-- Init function
DROP FUNCTION IF EXISTS transaction_history_init() CASCADE;
CREATE FUNCTION transaction_history_init() RETURNS void
LANGUAGE plpgsql AS
  $$
  BEGIN
    NULL;
  END;
$$;
