module.exports = {
  entity: 'politikreds',
  heading: 'Politikredse',
  lead: `API'et udstiller alle Danmarks politikredse.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Politikreds søgning',
      anchor: 'søgning',
      path: '/politikredse'
    },
    {
      type: 'endpoint',
      heading: 'Politikreds opslag',
      anchor: 'opslag',
      path: '/politikredse/{kode}'
    },
    {
      type: 'endpoint',
      heading: 'Politikreds autocomplete',
      anchor: 'autocomplete',
      path: '/politikredse/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Politikreds reverse geocoding',
      anchor: 'reverse',
      path: '/politikredse/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af politikredse',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver politikreds følgende informationer:`,
      entity: 'politikreds',
      qualifier: 'json'
    }
  ]
};
