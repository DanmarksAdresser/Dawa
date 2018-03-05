module.exports = {
  entity: 'replikering',
  heading: 'Replikerings-API',
  lead: `Replikerings-API'et gør det muligt at etablere og vedligeholde en lokal kopi af data fra DAWA.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Udtræk',
      anchor: 'udtraek',
      path: '/replikering/udtraek'
    },
    {
      type: 'endpoint',
      heading: 'Hændelser',
      anchor: 'haendelser',
      path: '/replikering/haendelser'
    },
    {
      type: 'endpoint',
      heading: 'Transaktioner',
      anchor: 'transaktioner',
      path: '/replikering/transaktioner',
    },
    {
      type: 'endpoint',
      heading: 'Seneste transaktion',
      anchor: 'senestetransaktion',
      path: '/replikering/senestetransaktion'
    }
  ]
};
