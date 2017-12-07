module.exports = {
  entity: 'vejstykkepostnummerrelation',
  heading: 'Vejstykke-postnummer releationer',
  lead: `API'et udstiller relationen mellem vejstykker og postnumre.`,
  sections: [
    {
      type: 'endpoint',
      anchor: 'udtræk',
      heading: 'Vejstykkepostnummerrelation - udtræk',
      path: '/replikering/vejstykkepostnummerrelationer'
    },
    {
      type: 'endpoint',
      anchor: 'hændelser',
      heading: 'Vejstykkepostnummerrelation - hændelser',
      path: '/replikering/vejstykkepostnummerrelationer/haendelser'
    }

  ]
};
