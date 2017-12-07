module.exports = {
  entity: 'bebyggelse',
  heading: 'Bebyggelser',
  lead: `API'et udstiller alle Danmarks bebyggelser (byer og bydele). 
  Nye applikationer bør anvende stednavne-API'et i stedet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Bebyggelsesøgning',
      anchor: 'søgning',
      path: '/bebyggelser'
    },
    {
      type: 'endpoint',
      heading: 'Bebyggelseopslag',
      anchor: 'opslag',
      path: '/bebyggelser/{id}'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af bebyggelsesdata',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver bebyggelse følgende informationer:`,
      entity: 'bebyggelse',
      qualifier: 'json'
    }
  ]
};
