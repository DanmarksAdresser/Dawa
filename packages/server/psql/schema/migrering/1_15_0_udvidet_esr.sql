ALTER TABLE jordstykker ADD COLUMN udvidet_esrejendomsnr TEXT;
CREATE INDEX ON jordstykker(udvidet_esrejendomsnr);
