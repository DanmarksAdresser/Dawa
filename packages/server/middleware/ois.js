const basicAuth = require('express-basic-auth');

const conf = require('@dawadk/common/src/config/holder').getConfig();

const isOisPath = req => (req.path.toLowerCase().indexOf('/ois') !== -1 &&
  req.path.toLowerCase() !== '/oisdok');


const oisBasicAuthMiddleware = () => {
  const oisUsers = {};
  oisUsers[conf.get('ois.login')] = conf.get('ois.password');
  return basicAuth({
    users: oisUsers,
    challenge: true,
    realm: 'OIS login'
  });
};

const oisMiddleWare = () => {
  const oisEnabled = conf.get('ois.enabled');
  const oisProtected = conf.get('ois.protected');
  if(!oisEnabled || oisProtected) {
    return(req, res, next) => {
      if (isOisPath(req)) {
        if(!oisEnabled) {
          return res.status(403).send('OIS currently disabled for all users');
        }
        if(oisProtected) {
          return oisBasicAuthMiddleware(req, res, next);
        }
      }
      next();
    };
  }
  else {
    return (req, res, next) => next();
  }
};

module.exports = {
  isOisPath, oisMiddleWare
};
