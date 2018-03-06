const registry = require('../apiSpecification/registry');

const {
  formatParameters
} = require('./common');
const txidIntervalDoc = [{
  name: 'txidfra',
  doc: 'Find hændelser med Transaktions-ID større end eller lig den angivne værdi.' +
  'Andvendes typisk sammen med txidtil parameteren'
},
  {
    name: 'txidtil',
    doc: 'Find hændelser med Transaktions-ID mindre end eller lig den angivne værdi.'
  },
];

const sekvensnummerIntervalDoc = [
  {
    name: 'sekvensnummerfra',
    doc: 'Heltal. Returner hændelser med sekvensnummer større eller lig det angivne'
  },
  {
    name: 'sekvensnummertil',
    doc: 'Heltal. Returner hændelser med sekvensnummer mindre eller lig det angivne'
  },
];

const tidspunktIntervalDoc = [
  {
    name: 'tidspunktfra',
    doc: 'Returnerer hændelser hvor tidspunktet for hændelsen er senere eller lig det angivne tidspunkt. Eksempel: 2014-05-23T08:39:36.181Z. Det anbefales at anvende sekvensnumre fremfor tidspunkter til fremsøgning af hændelser.'
  },
  {
    name: 'tidspunkttil',
    doc: 'Returnerer hændelser hvor tidspunktet for hændelsen er tidligere eller lig det angivne tidspunkt. Eksempel: 2014-05-23T08:39:36.181Z. Det anbefales at anvende sekvensnumre fremfor tidspunkter til fremsøgning af hændelser.'
  }
];

const replikeringDoc = (entityName, eventQueryParams, eventExamples) => {
  const nameAndKey = registry.findWhere({
    entityName: entityName,
    type: 'nameAndKey'
  });

  const udtraekParameterDoc = {
    entity: entityName,
    path: '/replikering/' + nameAndKey.plural,
    subtekst: `Udtraek for ${nameAndKey.plural}.`,
    parameters: [{
      name: 'sekvensnummer',
      doc: 'Angiver sekvensnummeret for udtrækket. Alle hændelser til og med det angivne sekvensnummer er med i udtrækket.'
    }].concat(formatParameters),
    examples: []
  };

  const eventParameterDocs = {
    entity: entityName,
    path: '/replikering/' + nameAndKey.plural + '/haendelser',
    subtekst: 'Hændelser for ' + nameAndKey.plural + '.',
    parameters: [
      ...txidIntervalDoc,
      ...sekvensnummerIntervalDoc,
      ...tidspunktIntervalDoc,
      ...eventQueryParams
    ],
    examples: eventExamples
  };
  return [udtraekParameterDoc, eventParameterDocs];
};

module.exports = {
  replikeringDoc,
  txidIntervalDoc,
  sekvensnummerIntervalDoc,
  tidspunktIntervalDoc
};
