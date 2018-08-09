module.exports = {
  entity: 'ejerlav',
  heading: 'Ejerlav',
  lead: `API'et udstiller alle Danmarks ejerlav.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Ejerlavsøgning',
      anchor: 'søgning',
      path: '/ejerlav'
    },
    {
      type: 'endpoint',
      heading: 'Ejerlavopslag',
      anchor: 'opslag',
      path: '/ejerlav/{kode}'
    },
    {
      type: 'endpoint',
      heading: 'Ejerlav autocomplete',
      anchor: 'autocomplete',
      path: '/ejerlav/autocomplete'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af ejerlavdata',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert ejerlav følgende informationer:`,
      entity: 'ejerlav',
      qualifier: 'json'
    }
  ]
};
