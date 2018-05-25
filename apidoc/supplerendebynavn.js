const {
  autocompleteSubtext,
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter
} = require('./common');

var supplerendeBynavneIdParameters = {
  name: 'navn',
  doc: 'Navnet på det supplerende bynavn, f.eks. <em>Holeby</em>',
  examples: ['Holeby', 'Aabybro']
};

var supplerendeBynavneParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche det supplerende bynavn. ' +
  'Wildcard * er tilladt i slutningen af hvert ord. Der returneres højst 1000 resultater ved anvendelse af parameteren.'
},
  supplerendeBynavneIdParameters,
  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.',
    examples: ['2700']
  },
  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  }];

module.exports = [
  {
    entity: 'supplerendebynavn',
    path: '/supplerendebynavne',
    subtext: '(DEPRECATED) Søg efter supplerende bynavne. Returnerer de supplerende bynavne som opfylder kriteriet.',
    parameters: supplerendeBynavneParameters.concat(formatAndPagingParams),
    examples: [{
      description: 'Find de supplerende bynavne som ligger i postnummeret <em>3700 Rønne</em>',
      query: [{name: 'postnr', value: '3700'}]
    },
      {
        description: 'Find de supplerende bynavne, hvor et ord i det supplerende bynavn starter med <em>aar</em>',
        query: [{name: 'q', value: "aar*"}]
      }]
  },
  {
    entity: 'supplerendebynavn',
    path:'/supplerendebynavne/{navn}',
    subtext: '(DEPRECATED) Modtag supplerende bynavn.',
    parameters: [supplerendeBynavneIdParameters],
    nomulti: true,
    examples: [{
      description: 'Hent det supplerende bynavn med navn <em>Aarsballe</em>',
      path: ['/supplerendebynavne/Aarsballe']
    }]
  },
  {
    entity: 'supplerendebynavn',
    path: '/supplerendebynavne/autocomplete',
    subtext: '(DEPRECATED) ' + autocompleteSubtext('supplerendebynavne'),
    parameters: overwriteWithAutocompleteQParameter(supplerendeBynavneParameters).concat(formatAndPagingParams),
    examples: [{
      description: 'Find alle supplerende bynavne som indeholder <em>sejr</em>',
      query: [{name: 'q', value: 'sejr'}]
    }]
  }
];
