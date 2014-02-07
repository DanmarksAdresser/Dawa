
var util = require('util');
var Transform = require('stream').Transform;
util.inherits(JSONPStream, Transform);

function JSONPStream(callbackname, response) {
  Transform.call(this, { objectMode: true });
  this.callbackname= callbackname;
  this.response= response;
  this.first= true;
}

exports.JSONPStream = JSONPStream;

JSONPStream.prototype._transform = function(chunk, encoding, done) {
  try {
    if (this.first) { 
      this.first= false;     
      this.response.charset= 'utf-8';
      if (this.callbackname===undefined) {     
        this.response.type('application/json');
      }
      else {
        this.response.type('application/javascript');
        this.push(this.callbackname+'(');
      }
    }
    if (chunk) {
      this.push(chunk);
      done();
    }
    else {
      this.push(null);
      done();
    }
  }
  catch(err) {
    done(err);
  }
};


JSONPStream.prototype._flush = function(done) {  
    if (this.callbackname!==undefined) {  
      this.push(');');
    }
    done();
};
