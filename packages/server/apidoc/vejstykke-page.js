module.exports = {
  entity: 'vejstykke',
  heading: 'Vejstykker',
  lead: `API'et udstiller Danmarks vejstykker samt tilhørende funktionalitet.`,
  body: `<p>Et vejstykke er en vej, som er afgrænset af en kommune. 
Et vejstykke er identificeret ved en kommunekode og en vejkode og har desuden et navn. 
En vej som gennemløber mere end en kommune vil bestå af flere vejstykker. 
Det er p.t. ikke muligt at få information om hvilke vejstykker der er en del af den samme vej.</p>`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Vejstykkesøgning',
      anchor: 'søgning',
      path: '/vejstykker'
    },
    {
      type: 'endpoint',
      heading: 'Vejstykkeopslag',
      anchor: 'opslag',
      path: '/vejstykker/{kommunekode}/{kode}'
    },
    {
      type: 'endpoint',
      heading: 'Vejstykker autocomplete',
      anchor: 'autocomplete',
      path: '/vejstykker/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Vejstykker reverse geocoding',
      anchor: 'reverse',
      path: '/vejstykker/reverse'
    },
    {
      type: 'endpoint',
      heading: 'Vejstykkes naboer',
      anchor: 'naboer',
      path: '/vejstykker/{kommunekode}/{kode}/naboer'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af vejstykker',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert vejstykke følgende informationer:`,
      entity: 'vejstykke',
      qualifier: 'json'
    }
  ]
};
