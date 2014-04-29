ALTER TABLE bbr_events ADD COLUMN sequence_number_from integer not null;
ALTER TABLE bbr_events ADD COLUMN sequence_number_to integer not null;
ALTER TABLE transaction_history DROP COLUMN bbr_event;
