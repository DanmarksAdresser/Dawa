module.exports = {
  entity: 'retskreds',
  heading: 'Retskredse',
  lead: `API'et udstiller Danmarks retskredse samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Retskredssøgning',
      anchor: 'søgning',
      path: '/retskredse'
    },
    {
      type: 'endpoint',
      heading: 'Retskredsopslag',
      anchor: 'opslag',
      path: '/retskredse/{kode}'
    },
    {
      type: 'endpoint',
      heading: 'Retskreds autocomplete',
      anchor: 'autocomplete',
      path: '/retskredse/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Retskreds reverse geocoding',
      anchor: 'reverse',
      path: '/retskredse/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af retskredse',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver retskreds følgende informationer:`,
      entity: 'retskreds',
      qualifier: 'json'
    }
  ]
};
