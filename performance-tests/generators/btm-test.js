module.exports = [{
  name: 'adresseudtræk',
  type: 'fixedConcurrency',
  url: '/adresser',
  concurrency: 5,
  rampUpDelay: 5000,
}, {
  name: 'jordstykkeudtræk',
  type: 'fixedConcurrency',
  url: '/jordstykker',
  concurrency: 5,
  rampUpDelay: 5000,
}];
