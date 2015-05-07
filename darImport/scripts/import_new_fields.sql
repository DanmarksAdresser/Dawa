UPDATE adgangsadresser
SET husnummerkilde = src.husnummerkilde,
  esdhreference    = src.esdhreference,
  journalnummer    = src.journalnummer,
  placering        = src.placering,
  ikraftfra        = src.ikraftfra
FROM full_adgangsadresser src
WHERE adgangsadresser.id = src.id;

UPDATE adgangsadresser_history
SET
  husnummerkilde = src.husnummerkilde,
  esdhreference  = src.esdhreference,
  journalnummer  = src.journalnummer,
  placering      = src.placering
FROM full_adgangsadresser src
WHERE adgangsadresser_history.id = src.id
      AND adgangsadresser_history.valid_to IS NULL;

UPDATE enhedsadresser
SET kilde       = src.kilde,
  esdhreference = src.esdhreference,
  journalnummer = src.journalnummer
FROM full_enhedsadresser src
WHERE enhedsadresser.id = src.id;

UPDATE enhedsadresser_history
SET
  kilde         = src.kilde,
  esdhreference = src.esdhreference,
  journalnummer = src.journalnummer
FROM full_enhedsadresser src
WHERE enhedsadresser_history.id = src.id
      AND enhedsadresser_history.valid_to IS NULL;