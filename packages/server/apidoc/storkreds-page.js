module.exports = {
  entity: 'storkreds',
  heading: 'Storkredse',
  lead: `API'et udstiller Danmarks storkredse samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Storkredssøgning',
      anchor: 'søgning',
      path: '/storkredse'
    },
    {
      type: 'endpoint',
      heading: 'Storkredsopslag',
      anchor: 'opslag',
      path: '/storkredse/{nummer}'
    },
    {
      type: 'endpoint',
      heading: 'Storkreds autocomplete',
      anchor: 'autocomplete',
      path: '/storkredse/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Storkreds reverse geocoding',
      anchor: 'reverse',
      path: '/storkredse/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af storkredse',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver storkreds følgende informationer:`,
      entity: 'sogn',
      qualifier: 'json'
    }
  ]
};
