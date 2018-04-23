const {
  autocompleteSubtext,
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter
} = require('./common');

const {
  replikeringDoc
} = require('./replikeringCommon');


const ejerlavKodeParameter = {
  name: 'kode',
  doc: 'Ejerlavets unikke kode. Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.',
  examples: ['170354', '80652']
};
const ejerlavParameters = [
  ejerlavKodeParameter,
  {
    name: 'navn',
    doc: 'Ejerlavets navn.',
    examples: ['Aarhus', 'København']
  },
  {
    name: 'q',
    doc: 'Søgetekst. Der søges i ejerlavsnavnet. Alle ord i søgeteksten skal matche ejerlavsnavnet. ' +
    'Wildcard * er tilladt i slutningen af hvert ord. Der returneres højst 1000 resultater ved anvendelse af parameteren.'
  }];

const ejerlavEventExamples =  [
  {
    description: 'Find alle ejerlavhændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
    query: [{
      name: 'sekvensnummerfra',
      value: '990'
    }, {
      name: 'sekvensnummertil',
      value: '1000'
    }]
  },
  {
    description: 'Find alle ejerlavhændelser for ejerlav med kode 20551',
    query: [{
      name: 'kode',
      value: '20551'
    }]
  }
];


module.exports = [
  {
    entity: 'ejerlav',
    path: '/ejerlav',
    subtext: 'Søg efter ejerlav. Returnerer de ejerlav som opfylder kriteriet.',
    parameters: ejerlavParameters.concat(formatAndPagingParams),
    examples: [{description: 'Hent alle ejerlav', query: []},
      {
        description: 'Find ejerlav <em>80652</em>',
        query: [{name: 'kode', value: "80652"}]
      },
      {
        description: 'Find ejerlav med navn <em>Lynge By, Lynge</em>',
        query: [{name: 'navn', value: "Lynge By, Lynge"}]
      }]
  },
  {
    entity: 'ejerlav',
    path: '/ejerlav/{kode}',
    subtext: 'Modtag ejerlav med angivet kode.',
    parameters: [ejerlavKodeParameter],
    nomulti: true,
    examples: [{
      description: 'Hent ejerlav 80652',
      path: ['/ejerlav/80652']
    }]
  },
  {
    entity: 'ejerlav',
    path: '/ejerlav/autocomplete',
    subtext: autocompleteSubtext('ejerlav'),
    parameters: overwriteWithAutocompleteQParameter(ejerlavParameters).concat(formatAndPagingParams),
    examples: [{
      description: 'Find alle ejerlav som indeholder <em>by</em> i navnet',
      query: [{name: 'q', value: 'by'}]
    }]
  },
  ...replikeringDoc('ejerlav', [ejerlavKodeParameter], ejerlavEventExamples)
];
