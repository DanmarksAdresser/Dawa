const idParameter = {
  name: 'id',
  doc: 'ID på det DAR objekt der ønskes historik for. Påkrævet parameter.'
};

const entityParameter = {
  name: 'entitet',
  doc: 'Angiver hvilken data type, der returneres historik for. Muligheder: "adresse", "husnummer", "navngivenvej". Påkrævet parameter.'
};

const attributesParameter = {
  name: 'attributter',
  doc: 'Komma-separeret liste af attributter, der returneres historik for. Som udgangspunkt returneres alle attributter for objektet og relaterede objekter.'
};

const examples = [
  {
    description: 'Modtag historik for adressen med ID 2ecce5a7-e717-4b45-8781-279f0b9f423b',
    query: [{
      name: 'id',
      value: '2ecce5a7-e717-4b45-8781-279f0b9f423b'
    }, {
      name: 'entitet',
      value: 'adresse'
    }]
  },
  {
    description: 'Modtag historik for den navngivne vej med ID 9c8b04c8-b615-408a-9cfa-9c01cfe80cd0',
    query: [{
      name: 'id',
      value: '9c8b04c8-b615-408a-9cfa-9c01cfe80cd0'
    }, {
      name: 'entitet',
      value: 'navngivenvej'
    }]
  },
  {
    description: 'Modtag historik for attributterne "adressebetegnelse" og "navngivenvej_vejnavn" for adressen med ID "0a3f50a0-7b75-32b8-e044-0003ba298018"',
    query: [
      {
        name: 'entitet',
        value: 'adresse'
      },
      {
        name: 'id',
        value: '0a3f50a0-7b75-32b8-e044-0003ba298018'
      },
      {
        name: 'attributter',
        value: 'adressebetegnelse,navngivenvej_vejnavn'
      }
    ]
  }];
module.exports = [
  {
    entity: 'darhistorik',
    path: '/darhistorik',
    subtext: `<p>EXPERIMENTIELT API. Dette API er et eksperimentielt API, som ikke er endeligt fastlagt på
    nuværende tidspunkt.
    Der vil sandsynligvis blive foretaget ikke-kompatible ændringer i API'et uden varsel.</p>
    <p>Modtag DAR historik for et objekt og relaterede objekter. Det er muligt at modtage historik for
    adresser, husnumre og navngivne veje.</p> `,
    parameters: [idParameter, entityParameter, attributesParameter],
    examples
  }];
