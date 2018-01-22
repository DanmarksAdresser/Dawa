module.exports = {
  entity: 'region',
  heading: 'Regioner',
  lead: `API'et udstiller Danmarks regioner samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Regionsøgning',
      anchor: 'søgning',
      path: '/regioner'
    },
    {
      type: 'endpoint',
      heading: 'Regionsopslag',
      anchor: 'opslag',
      path: '/regioner/{kode}'
    },
    {
      type: 'endpoint',
      heading: 'Region autocomplete',
      anchor: 'autocomplete',
      path: '/regioner/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Region reverse geocoding',
      anchor: 'reverse',
      path: '/regioner/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af regioner',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver region følgende informationer:`,
      entity: 'region',
      qualifier: 'json'
    }
  ]
};
