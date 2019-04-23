const config = require('@dawadk/common/src/config/holder').getConfig();

const blob_base_url = config.get('blob_base_url');
module.exports = refid => `${blob_base_url}/${refid}`;