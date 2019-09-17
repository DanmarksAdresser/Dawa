module.exports = (level, message, error) => {
  /* eslint no-console: 0 */
  console.log(`${level}: ${message}`);
  if(level === 'error' && error) {
    console.error(error);
  }
};