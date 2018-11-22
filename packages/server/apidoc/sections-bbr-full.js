const bbrOrder = ['enhed', 'bygning', 'tekniskanlaeg','ejerskab', 'grund', 'matrikelreference', 'opgang', 'etage', 'bygningspunkt', 'kommune'];

module.exports = [{
  name: 'BBR',
  headingClass: 'h2-icon h2-bbr',
  lead: 'For en generel introduktion til BBR, se <a href="/dok/bbr">her<a/>.',
  entities: bbrOrder.map(entityName => `BBR intern ${entityName}`)
}];
