console.log('vejnavneoperationer modul');

var util= require("util")
  , dawaStream= require("./dawastream")
	, utility= require('./utility');

exports.sogvejnavne= function(database) {
	var db= database;
	var soeg= function (req, res) {	 
	  var type= utility.getFormat(req.params[0]);
	  if (type === undefined) {
	    res.send(400,"Ukendt suffix. Brug csv, json eller html.");
	    return;
	  }
	  var options = {};  
	  var pag= utility.paginering(req.query);
	  switch(pag.status) {
	    case 1:
	      options.skip= pag.skip;
	      options.limit= pag.limit;
	      break;
	    case 2:      
	      res.send(400,"Paginering kræver både parametrene side og per_side");
	      return;
	    case 0:
	      break;
	  }
	  var query = {}; 
	  if (req.query.navn) {
	    query['navn'] = utility.wildcard(req.query.navn); 
	  }
	  if (req.query.postnr) {
	    query['postnumre'] = req.query.postnr;
	  }
	  if (req.query.q) {
	    query['kommuner'] = req.query.kommune;
	  }
	  db.collection('vejnavne', function (err, collection) {
	    if (err) {
	      console.warn(err.message);
	      res.jsonp("fejl: " + err, 500);
	      return;
	    }
	    options.sort= 'navn';
	    var cursor = collection.find(query, { _id: 0 },options);// , req.query.maxantal ? { limit: req.query.maxantal } : {});	   
	    dawaStream.streamVejnavne(type, cursor, false, req.query.callback, res);
	  });
	};
	return soeg;
};