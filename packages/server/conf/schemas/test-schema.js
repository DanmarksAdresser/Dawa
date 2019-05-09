module.exports = {
  test: {
    dawa_base_url: {
      doc: 'URL til dawa server',
      format: 'string',
      default: 'http://localhost:3000'
    },
    master_base_url: {
      doc: 'URL til DAWA master isalive',
      format: 'string',
      default: 'http://localhost:3001'
    }
  }
};