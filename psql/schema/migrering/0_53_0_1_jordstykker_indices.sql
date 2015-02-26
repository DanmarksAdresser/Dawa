-- Jordstykker
CREATE INDEX ON temaer((fields->>'ejerlavkode'), (fields->>'matrikelnr')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer(((fields->>'ejerlavkode')::integer), (fields->>'matrikelnr')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'matrikelnr')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'kommunekode')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'regionskode')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'retskredskode')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'sognekode')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'esrejendomsnr')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'sfeejendomsnr')) WHERE tema = 'jordstykke';
