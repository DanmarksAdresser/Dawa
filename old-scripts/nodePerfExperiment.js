var util        = require("util")
var MongoClient = require('mongodb').MongoClient;

function mongoReadTest(){
  MongoClient.connect(
    "mongodb://pmm:Dawa1234@ds033268-a0.mongolab.com:33268,ds033268-a1.mongolab.com:33268/adressedb",
    function (err, database) {
      if (err) {
	console.warn('Database ikke åbnet: ' + err.message);
	process.exit(1);
      }

      database.on('error', function (err) {
	console.log('db.on(\'error\'):', err);
      });

      var begin = new Date().getTime();
      database.collection('adresser', function (err, collection) {
	if (err) {
	  console.warn(err.message);
	  return;
	}
	var count = 0;
	var cursor = collection.find({}).limit(1);
	cursor.each(function(err, adresse){
	  console.log(adresse);
	  if (err) {
	    console.log(err);}
	  else {
	    if (count % 1000 === 0){
	      var t = ((new Date().getTime())-begin);
	      console.log('count='+count+" time="+t/1000+" avg="+count/(t/1000)+" reads/sec");
	    }
	  }
	  count++;
	});

      });
      console.log("It works");
    });
}

function regExpTest(){

  var r = /^[1-9]$|^[1-9][0-9]$|^st$|^kl[0-9]?$/;
  console.log("99".match(r));
  console.log("1".match(r));
  console.log("st".match(r));
  console.log("kl".match(r));
  console.log("kl1".match(r));
  console.log("kl9".match(r));
  console.log("0".match(r));
  console.log("100".match(r));
  console.log("kl10".match(r));

  console.log('=================');

  var husnr = /^(([1-9]|[1-9]\d|[1-9]\d{2})[A-Z]?)$/;
  console.log("1".match(husnr));
  console.log("999".match(husnr));
  console.log("4A".match(husnr));
  console.log("999T".match(husnr));
  console.log("1000".match(husnr));
  console.log("0".match(husnr));


}


regExpTest();
