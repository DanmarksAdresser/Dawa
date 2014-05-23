create unique index transaction_history_pkey on transaction_history(sequence_number);
ALTER TABLE transaction_history add primary key using index transaction_history_pkey;
create index on transaction_history(entity, time);
create index on transaction_history(entity, sequence_number);