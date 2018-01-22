module.exports = {
  entity: 'zone',
  heading: 'Vejstykke-postnummer releationer',
  lead: `API'et udstiller relationen mellem adgangsadresser og zone (byzone, landzone, sommerhusområde)..`,
  sections: [
    {
      type: 'endpoint',
      anchor: 'udtræk',
      heading: 'Zonetilknytninger - udtræk',
      path: '/replikering/zonetilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'hændelser',
      heading: 'Zonetilknytninger - hændelser',
      path: '/replikering/zonetilknytninger/haendelser'
    }

  ]
};
