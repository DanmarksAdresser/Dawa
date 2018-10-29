const navngivenvej = [
  {
    entity: 'dar_navngivenvej_historik',
    alias: 'navngivenvej'
  }
];

const husnummer = [
  {
    entity: 'dar_husnummer_historik',
    alias: 'husnummer',
    join: [['adresse.husnummer_id', 'husnummer.id']]
  },
  {
    entity: 'dar_adressepunkt_historik',
    alias: 'adgangspunkt',
    join: [['husnummer.adgangspunkt_id', 'adgangspunkt.id']],
    excluded: ['id']
  },
  {
    entity: 'dar_adressepunkt_historik',
    alias: 'vejpunkt',
    join: [['husnummer.vejpunkt_id', 'vejpunkt.id']],
    excluded: ['id']
  },
  {
    entity: 'dar_darkommuneinddeling_historik',
    alias: 'kommune',
    join: [['husnummer.darkommune_id', 'kommune.id']],
    excluded: ['id']
  },
  {
    entity: 'dar_navngivenvej_historik',
    alias: 'navngivenvej',
    join: [['husnummer.navngivenvej_id', 'navngivenvej.id']],
    excluded: [
      'id',
      'vejnavnebeliggenhed_vejnavnelinje',
      'vejnavnebeliggenhed_vejnavneområde',
      'vejnavnebeliggenhed_vejtilslutningspunkter',
      'vejnavnebeliggenhed_oprindelse_kilde',
      'vejnavnebeliggenhed_oprindelse_nøjagtighedsklasse',
      'vejnavnebeliggenhed_oprindelse_registrering',
      'vejnavnebeliggenhed_oprindelse_tekniskstandard'
    ]
  },
  {
    entity: 'dar_navngivenvejkommunedel_historik',
    alias: 'navngivenvejkommunedel',
    join: [
      ['navngivenvej.id', 'navngivenvejkommunedel.navngivenvej_id'],
      ['kommune.kommunekode', 'navngivenvejkommunedel.kommune']
    ],
    excluded: ['navngivenvej_id']
  },
  {
    entity: 'dar_postnummer_historik',
    alias: 'postnummer',
    join: [['husnummer.postnummer_id', 'postnummer.id']],
    excluded: ['id']
  },
  {
    entity: 'dar_supplerendebynavn_historik',
    alias: 'supplerendebynavn',
    join: [['husnummer.supplerendebynavn_id', 'supplerendebynavn.id']],
    excluded: ['id']
  },
  {
    entity: 'dar_darafstemningsområde_historik',
    alias: 'afstemningsområde',
    join: [['husnummer.darafstemningsområde_id', 'afstemningsområde.id']],
    excluded: ['id']
  },
  {
    entity: 'dar_darsogneinddeling_historik',
    alias: 'sogn',
    join: [['husnummer.darsogneinddeling_id', 'sogn.id']],
    excluded: ['id']
  },
  {
    entity: 'dar_darmenighedsrådsafstemningsområde_historik',
    alias: 'menighedsrådsafstemningsområde',
    join: [['husnummer.darmenighedsrådsafstemningsområde_id', 'menighedsrådsafstemningsområde.id']],
    excluded: ['id']
  }
];

const adresse = [
  {
    entity: 'dar_adresse_historik',
    alias: 'adresse'
  },
  {
    entity: 'dar_husnummer_historik',
    alias: 'husnummer',
    join: [['adresse.husnummer_id', 'husnummer.id']],
    excluded: ['id']
  },
  ...husnummer.slice(1)];

module.exports = {navngivenvej, husnummer, adresse};