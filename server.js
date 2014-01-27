"use strict";

var express             = require("express");
var util                = require("util");
var utility             = require('./utility');
var postnroperationer   = require('./postnroperationer');
var vejnavneoperationer = require('./vejnavneoperationer');
var dawaStream          = require("./dawastream");
var MongoClient         = require('mongodb').MongoClient;
var dawaApi             = require('./dawaApi');
var dawaPgApi           = require('./dawaPgApi');

var app = express();

app.use(express.logger('dev'));
app.use(express.compress());
app.use(express.static(__dirname + '/public', {maxAge: 86400000}));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.render('home.jade', {url: req.headers.host});
});

app.get('/generelt', function (req, res) {
  res.render('generelt.jade', {url: req.headers.host});
});

app.get('/adressedok', function (req, res) {
  res.render('adressedok.jade', {url: req.headers.host});
});

app.get('/adgangsadressedok', function (req, res) {
  res.render('adgangsadressedok.jade', {url: req.headers.host});
});

app.get('/vejnavndok', function (req, res) {
  res.render('vejnavndok.jade', {url: req.headers.host});
});

app.get('/supplerendebynavndok', function (req, res) {
  res.render('supplerendebynavndok.jade', {url: req.headers.host});
});

app.get('/postnummerdok', function (req, res) {
  res.render('postnummerdok.jade', {url: req.headers.host});
});

app.get('/listerdok', function (req, res) {
  res.render('listerdok.jade', {url: req.headers.host});
});

app.get('/om', function (req, res) {
  res.render('om.jade');
});
//(\/[^\.])
app.get(/html$/i, function (req, res) {
  console.log('html url: '+req.originalUrl.replace('.html','.json') + ', ' + decodeURIComponent(req.originalUrl.replace('.html','.json')));
  res.render('kort.jade', {url: decodeURIComponent(req.originalUrl.replace('.html','.json'))});
});


// adresser/{unik id}
app.get(/^\/adresser\/([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})(?:\.(\w+))?$/i, function (req, res) {
  var guid= req.params[0];
  var type= utility.getFormat(req.params[1]);
  if (type === undefined) {
    res.send(400,"Ukendt suffix. Brug csv, json eller html.");
    return;
  }
  console.log("guid genkendt; %s", guid);
  db.collection('adresser', function (err, collection) {
    if (err) {
      console.warn(err.message);
      res.jsonp("fejl: " + err, 500);
      return;
    }    
    var query = {}; 
    query.id= guid;
    console.log(util.inspect(query));
    var cursor = collection.find(query, { _id: 0 }); 
    dawaStream.streamAdresser(type, cursor, true, req.query.callback, res, req);
    //ser.serializeAdresse(cursor, req, res);
   /* cursor.toArray(function (err, docs) {
      if (err) {
        console.warn('err: ' + err);
        res.jsonp("fejl: " + err, 500);
        return;
      }
      if (docs.length === 1) {
        res.statusCode = 200;
        //res.setHeader("Cache-Control", "public, max-age=86400");
        res.jsonp(docs[0]);
      }
      else {        
        res.jsonp("Adresse ukendt", 404);
      }
    }); */
  });
});

function findAdresse(collection, længde, bredde, radius, cb) { 
  console.log('radius: %s', radius);  
    var cursor = collection.find(
              {"adressepunkt.wgs84koordinat": 
                {$near: 
                  {$geometry: 
                    {type: "Point", coordinates: [længde, bredde]}
                  },
                  $maxDistance : radius
                }
              }, { _id: 0 },{ limit: 1 });
    cursor.nextObject(function (err, doc) {
      if (err) {
        console.warn('err: ' + err);
        //res.jsonp("fejl: " + err, 500);
        return;
      }
      if (doc) {
        cursor= cursor.rewind();
        cb(cursor);
        //cb(doc);
      }
      else {
        if (radius<100000) {          
          return findAdresse(collection, længde, bredde, radius*10, cb);
        } 
        else {       
          cb(null);
        }
      }
    });
}

// adresser/{bredde},{længde}
app.get(/^\/adresser\/(\d+\.?\d*),(\d+\.?\d*)(?:\.(\w+))?$/i, function (req, res) {
  var bredde= parseFloat(req.params[0])
    , længde= parseFloat(req.params[1])
    , type= utility.getFormat(req.params[2]);
  if (type === undefined) {
    res.send(400,"Ukendt suffix. Brug csv, json eller html.");
    return;
  }
  db.collection('adresser', function (err, collection) {
    if (err) {
      console.warn(err.message);
      res.jsonp("fejl: " + err, 500);
      return;
    } 
    findAdresse(collection, længde, bredde, 50, function(cursor) {
      if (cursor) {
//        ser.serializeAdresseDoc(adresse, req, res);
        dawaStream.streamAdresser(type, cursor, true, req.query.callback, res, req);
      }
      else {          
        res.jsonp("Adresse ukendt", 404);
      }
    });
  });
});


//app.get('/validadresse?vejnavn={vejnavn}&husnr={husnr}&postnr={postnr}&bynavn={bynavn}&etage={etage}&dør={dør} 
// husk intevaladresser
app.get(/^\/adresser\/valid(?:\.(\w+))?$/i, function (req, res) {
//app.get(/^\/adresser\/([^,]+)(?:\,(\w+))(?:\,(\d+))(?:\,(\w+))?(?:\,(\w+))?$/, function (req, res) { //,:etage?,:dør?
  console.log('type: %s', type);
  var type= utility.getFormat(req.params[0]);
  if (type === undefined) {
    res.send(400,"Ukendt suffix. Brug csv, json eller html.");
    return;
  }
  console.log('type: %s', type);
  var vejnavn= req.query.vejnavn
    , husnr= req.query.husnr
    , postnr= req.query.postnr
    , bynavn= req.query.bynavn
    , etage= req.query.etage
    , dor= req.query.dør
   // var vejnavn= req.params[0]
   //  , husnr= req.params[1]
   //  , postnr= req.params[2]
   //  , etage= req.params[3]
   //  , dor= req.params[4]

  console.log("%s,%s,%s,%s,%s,%s",vejnavn,husnr,postnr,bynavn,etage,dor);
  var query = {};  
  if (vejnavn) {
    //query.vej= {};
    query['vej.navn'] = vejnavn; 
  }
  if (husnr) {
    query.husnr = husnr;
  }
  if (postnr) {
    query['postnummer.nr'] = postnr;
  }
  if (bynavn) {
    query['supplerendebynavn'] = bynavn;
  }
  if (etage) {
    query.etage = (etage.match(/^\d+$/) != null)?etage:new RegExp('^'+etage, 'gi');
  }
  if (dor) {
    query.dør= new RegExp('^'+dor+'$', 'gi');
  }
  db.collection('adresser', function (err, collection) {
    if (err) {
      console.warn(err.message);
      res.jsonp("fejl: " + err, 500);
      return;
    }
    console.log(util.inspect(query));
    var cursor = collection.find(query, { _id: 0 });
    cursor.count(function (err, count) {
      if (err) {
        console.warn('err: ' + err);
        res.jsonp("fejl: " + err, 500);
        return;
      }
      if (count === 1) {
        res.statusCode = 200;
        //res.setHeader("Cache-Control", "public, max-age=86400");

        dawaStream.streamAdresser(type, cursor, true, req.query.callback, res, req);
        //ser.serializeAdresse(cursor, req, res);
        //res.jsonp(docs[0]);
      }
      else {        
        res.jsonp("Adresse er ikke valid", 404);
      }
    });
  });
});

function matches(value) {
  var v;
  var values= value.split(',');
  if (values.length===1) {
    v= value;
  }
  else {
    v= {};
    v.$in= values;
  }
  return v;
}

// adressesøgning
app.get(/^\/adresser(?:\.(\w+))?$/i, function (req, res) { 
  var type= utility.getFormat(req.params[0]);
  if (type === undefined) {
    res.send(400,"Ukendt suffix. Brug csv, json, geojson eller html.");
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
  if (req.query.vejnavn) {
    //query.vej= {};
    query['vej.navn'] = utility.wildcard(req.query.vejnavn); 
  }
  if (req.query.husnr) {
    query.husnr = req.query.husnr;
  }
  if (req.query.postnr) {
    query['postnummer.nr'] = matches(req.query.postnr);
  }
  if (req.query.kommune) {
    query['kommunekode'] = matches(req.query.kommune);
  }
  if (req.query.etage) {
    query.etage = (req.query.etage.match(/^\d+$/) != null)?req.query.etage:
    new RegExp('^'+req.query.etage+'$', 'gi');
  }
  if (req.query.dør) {
    query.dør =  utility.wildcard(req.query.dør);
  }
  if (req.query.cirkel) {
    var fields= req.query.cirkel.split(',');
    if (fields.length != 3) {      
      res.send(400,"cirkel defineres som <længde>,<bredde>,<radius>");
      return;
    }
    var bredde= parseFloat(fields[0])
      , længde= parseFloat(fields[1])
      , radius= parseInt(fields[2])
    query['adressepunkt.wgs84koordinat']=
                {$near: 
                  {$geometry: 
                    {type: "Point", coordinates: [længde, bredde]}
                  },
                  $maxDistance : radius
                };

  }  
  if (req.query.sogn) {
    query['sogn.nr'] = matches(req.query.sogn);
  }
  db.collection('adresser', function (err, collection) {
    if (err) {
      console.warn(err.message);
      res.jsonp("fejl: " + err, 500);
      return;
    }
    var cursor = collection.find(query, { _id: 0 },options);// , req.query.maxantal ? { limit: req.query.maxantal } : {});
    dawaStream.streamAdresser(type, cursor, false, req.query.callback, res, req);
    //ser.serializeAdresser(cursor, req, res);
    // cursor.toArray(function (err, docs) {
    //   if (err) {
    //     console.warn('err: ' + err);
    //     res.jsonp("fejl: " + err, 500);
    //     return;
    //   }
    //   else {
    //     res.statusCode = 200;
    //     //res.setHeader("Cache-Control", "public, max-age=86400");
    //     res.jsonp(docs);
    //   }
    // });
  });
});


// autocompletesøgning q=vejnavn husnr etage dør, postnr
app.get(/^\/adresser\/autocomplete(?:\.(\w+))?$/i, function (req, res) { 
  var type= utility.getFormat(req.params[0]);
  if (type === undefined) {
    res.send(400,"Ukendt suffix. Brug csv, json eller html.");
    return;
  }
  if (req.query.q === undefined) {
    res.send(400,"Parameter q skal anvendes.");
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
  var kommune= req.query.kommune;
  var vejnavn= req.query.vejnavn!==undefined;
  var pat= '^'+(vejnavn?'('+req.query.vejnavn+')':'([a-zæøå\\s-.]+)')+'(?:\\s*(\\d+[a-z]?))?(?:,?\\s(\\d+|kl|st).?)?(?:\\s+([\\da-z]+))?(?:\\s*-\\s*(\\d*)?\\s?[a-zæøå\\s-]*)?';
  console.log('RegExp: '+pat);
  var adrpat= new RegExp(pat,'i');
  var parts= adrpat.exec(req.query.q.toLocaleLowerCase());
  if (parts === null) {
    res.jsonp([],200);
    return;
  }
  console.log('Vejnavn: ' + vejnavn + " Parts: " + parts + " length: "+parts.length);
  if (!vejnavn) {
    var query = {};  
    query['navn'] = utility.spells(parts[1]); 
    if (kommune) query.kommuner= kommune;
    db.collection('vejnavne', function (err, collection) {
      if (err) {
        console.warn(err.message);
        res.jsonp("fejl: " + err, 500);
        return;
      }
      options.sort= 'navn';
      var cursor = collection.find(query, { _id: 0 }, options);// , req.query.maxantal ? { limit: req.query.maxantal } : {});
      console.log(util.inspect(query));
      //res.setHeader("Cache-Control", "public, max-age=900000");
      //ser.serializeFritekstAdresser(cursor, req, res);      
      dawaStream.streamAutocompleteAdresser(type, cursor, false, req.query.callback, res, req);
    });
  }
  else {
    var query = {};  
    if (parts[1]) {
      //query.vej= {};
      query['vej.navn'] = req.query.vejnavn.trim();//new RegExp('^'+ parts[1].trim() + (exact?'$':''),'i');
    }
    if (parts[2]) {
      query.husnr = new RegExp('^'+ parts[2],'i');
    }
    if (parts[3]) {
      query.etage= new RegExp('^'+parts[3], 'gi');
    }
    if (parts[4]) {
      query.dør =  new RegExp('^'+ parts[4]);
    }    
    if (parts[5]) {
      query['postnummer.nr'] = new RegExp('^'+ parts[5]);
    }

    if (kommune) query.kommunekode= kommune;
    db.collection('adresser', function (err, collection) {
      if (err) {
        console.warn(err.message);
        res.jsonp("fejl: " + err, 500);
        return;
      }
      var cursor = collection.find(query, { _id: 0 }, {sort: [['vej.navn', 'asc'],['husnr', 'asc'],['etage', 'asc'],['dør', 'asc']]});// , req.query.maxantal ? { limit: req.query.maxantal } : {});
      console.log(util.inspect(query));      
      //res.setHeader("Cache-Control", "public, max-age=900000");
      //ser.serializeAdresser(cursor, req, res);

      dawaStream.streamAdresser(type, cursor, false, req.query.callback, res, req);
    });
  }
});


var db;
console.log("MongoDB connection: "+process.env.connectionstring);
MongoClient.connect(process.env.connectionstring,function (err, database) {
  if (err) {
    console.warn('Database ikke åbnet: ' + err.message);
    process.exit(1);
  }

  database.on('error', function (err) {
      console.log('db.on(\'error\'):', err);
  });

  var listenPort = process.env.PORT || 3000;

  db = database;

  app.use('/api', dawaApi(db));
  app.use('/api/pg', dawaPgApi.setupRoutes());

  app.get(/^\/postnumre(?:\.(\w+))?$/i, postnroperationer.sogpostnumre(db));
  app.get(/^\/vejnavne(?:\.(\w+))?$/i, vejnavneoperationer.sogvejnavne(db));
  app.listen(listenPort);
  console.log("Express server listening on port %d in %s mode", listenPort, app.settings.env);
});
