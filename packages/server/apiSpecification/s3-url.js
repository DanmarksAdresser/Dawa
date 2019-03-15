const config = require('@dawadk/common/src/config/holder').getConfig();

const { bucket, path } = config.get('s3_offload');
const { endpoint} = config.get('s3_offload.s3');
module.exports = refid => {
  if(endpoint) {
    return `${endpoint}/${bucket}/${path}/${refid}`
  }
  else {
    return `https://${bucket}.s3.amazonaws.com/${path}/${refid}`;
  }
};