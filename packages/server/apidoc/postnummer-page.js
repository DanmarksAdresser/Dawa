module.exports = {
  entity: 'postnummer',
  heading: 'Postnumre',
  lead: `API'et udstiller Danmarks postnumre samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Postnummersøgning',
      anchor: 'søgning',
      path: '/postnumre'
    },
    {
      type: 'endpoint',
      heading: 'Postnummeropslag',
      anchor: 'opslag',
      path: '/postnumre/{nr}'
    },
    {
      type: 'endpoint',
      heading: 'Postnummer autocomplete',
      anchor: 'autocomplete',
      path: '/postnumre/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Postnummer reverse geocoding',
      anchor: 'reverse',
      path: '/postnumre/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af postnumre',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert postnummer følgende informationer:`,
      entity: 'postnummer',
      qualifier: 'json'
    }
  ]
};
