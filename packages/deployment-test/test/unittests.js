"use strict";

process.on('unhandledRejection', up => { throw up })

var assert = require("assert")
  ,	request = require("request")
  , util= require('util')
  , csv = require('csv')
  , rp = require('request-promise')
  , http= require('http')
  , _= require("underscore");

//var host= "http://localhost:3000";
//var host= "https://dawa-p2.aws.dk";

var host= "https://dawa.aws.dk";
//var host= "http://52.212.234.159";

if (process.env.URL) host= process.env.URL; // windows: set URL=http://dawa-p1.aws.dk, mac: URL=http://dawa-p1.aws.dk mocha unittests.js -t 20000
console.log(host);


describe('Autocomplete', function(){

  it('Autocomplete med callback', function(done){

    function cb(response) {  
      //console.log(response[0].tekst); 
      return response.length;
    }

    request(encodeURI(host+'/autocomplete?q=rødkildev&type=vejnavn&caretpos=9&callback=cb&cache=no-cache'), function (error, response, body) {      
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var len= eval(body);
      assert(len>1);  
      done();
    })
  });

});

describe('Adressevalidering', function(){

  it('Alleshavevej,11,4593 er ok', async () => {
    const result = await rp({url: encodeURI(host+'/adresser?vejnavn=Alleshavevej&husnr=11&postnr=4593&cache=no-cache'), json: true});
    assert.strictEqual(result.length,1);
  });

  it('Lilledal,23,3450,1,tv er ok', function(done){
    request(encodeURI(host+'/adresser?vejnavn=Lilledal&husnr=23&postnr=3450&etage=1&dør=tv&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert.equal(adresser.length,1);
	    done();
	  });
	});

  it('Hulgårdsvej,67,2400 er ok', function(done){
    request(encodeURI(host+'/adresser?vejnavn=Hulgårdsvej&husnr=67&postnr=2400&etage=&dør=&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert.equal(adresser.length,1);
	    done();
	  });
	});

});

describe('Adressesøgning', function(){

  it('rødkild*, 46, 2400', function(done){
    request(encodeURI(host+'/adresser?q=rødkild*&husnr=46&postnr=2400&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert.equal(adresser.length,1);
      done();
    })
  })

  it('Konsul Beÿers Allé 2, 4300', function(done){
    request(encodeURI(host+'/adresser?q=Konsul Beÿers Allé 20, 4300&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>=1);
      //console.log(adresser[0].adressebetegnelse);
      done();
    })
  })

  it('vejnavn=Rødkildevej', function(done){
    request(encodeURI(host+'/adresser?vejnavn=Rødkildevej&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>1);
      done();
    })
  })

  it('vejnavn=Rødkildevej&struktur=mini', function(done){
    request(encodeURI(host+'/adresser?vejnavn=Rødkildevej&struktur=mini&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>1);
      done();
    })
  })


  it('regionskode=1083&husnr=77', function(done){
    request(encodeURI(host+'/adgangsadresser?regionskode=1083&husnr=77&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>1);
      done();
    })
  })

  it('regionskode=1083&husnr=77&struktur=mini', function(done){
    request(encodeURI(host+'/adgangsadresser?regionskode=1083&husnr=77&struktur=mini&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>1);
      done();
    })
  })

  it('nøjagtighed=U', function(done){
    request(encodeURI(host+'/adgangsadresser?nøjagtighed=U&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length===0);
      done();
    })
  })

  it('ejerlavkode=2000162&matrikelnr=381', function(done){
    request(encodeURI(host+'/adresser?ejerlavkode=2000162&matrikelnr=381&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>1);
      done();
    })
  })

  // it('postnr=8330&vejnavn=Nygårds Allé', function(done){
  //   request(encodeURI(host+'/adresser?postnr=8330&vejnavn=Nygårds Allé&cache=no-cache'), function (error, response, body) {    
  //     assert.equal(error,null);
  //     assert.equal(response.statusCode,200);
  //     var adresser= JSON.parse(body);
  //     assert(adresser.length>0);
  //     done();
  //   })
  // })

});

describe('Adresseopslag', function(){

  it('2f725450-a76a-11e2-9692-b7a1608861ab', function(done){
    request(encodeURI(host+'/adresser/0a3f50a0-73ca-32b8-e044-0003ba298018?cache=no-cache'), function (error, response, body) {   
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      done();
    })
  }) 

  it('2f725450-a76a-11e2-9692-b7a1608861ab?struktur=mini', function(done){
    request(encodeURI(host+'/adresser/0a3f50a0-73ca-32b8-e044-0003ba298018?struktur=mini&cache=no-cache'), function (error, response, body) {   
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      done();
    })
  })

  it("korrekt indhold", async () => {

    var options= {};
    options.baseUrl= host;
    options.url='adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.id= '0a3f50a0-73ca-32b8-e044-0003ba298018';
    options.json = true;
    const adresser = await rp(options);
    assert(adresser.length===1, "Flere forekomster. Antal: " + adresser.length);
    const adresse= adresser[0];
    assert(adresse.id==="0a3f50a0-73ca-32b8-e044-0003ba298018", 'Id forskellig: ' + adresse.id);
    assert(adresse.status===1, 'Status forskellig:' + adresse.status);
    assert(adresse.kvhx==="01016100__46_______", 'kvhx forskellig: ' + adresse.kvhx);
    assert(adresse.historik.oprettet==="2000-02-05T20:25:16.000", 'oprettet forskellig:' + adresse.historik.oprettet);
    assert(adresse.historik.ændret==="2000-02-05T20:25:16.000", 'ændret forskellig: ' + adresse.historik.ændret);
    assert(adresse.etage===null, 'etage forskellig: ' + adresse.etage);
    assert(adresse.dør===null, 'dør forskellig: ' + adresse.dør);
    assert(adresse.adgangsadresse.vejstykke.navn==="Rødkildevej", 'adresse.vejstykke.navn: ' + adresse.adgangsadresse.vejstykke.navn);
    assert(adresse.adgangsadresse.vejstykke.kode==="6100", 'adresse.vejstykke.kodeforskellig: ' + adresse.adgangsadresse.vejstykke.kode);
    assert(adresse.adgangsadresse.vejstykke.adresseringsnavn==="Rødkildevej", 'adresse.vejstykke.adresseringsnavn forskellig: ' + adresse.adgangsadresse.vejstykke.adresseringsnavn);
    assert(adresse.adgangsadresse.husnr==="46", 'adresse.husnr: ' + adresse.adgangsadresse.husnr);
    assert(adresse.adgangsadresse.navngivenvej.id==="d05d536a-febb-49f1-bcb8-8a2849e31fe2", 'adresse.navngivenvej.id forskellig: ' + adresse.adgangsadresse.navngivenvej.id);
    assert(adresse.adgangsadresse.supplerendebynavn===null, 'adresse.supplerendebynavn forskellig: ' + adresse.adgangsadresse.supplerendebynavn);
    assert(adresse.adgangsadresse.supplerendebynavn2===null, 'adresse.supplerendebynavn2 forskellig: ' + adresse.adgangsadresse.supplerendebynavn2);
    assert(adresse.adgangsadresse.postnummer.nr==="2400", 'adresse.postnummer.nr forskellig: ' + adresse.adgangsadresse.postnummer.nr);
    assert(adresse.adgangsadresse.postnummer.navn==="København NV", 'adresse.postnummer.navn forskellig: ' + adresse.adgangsadresse.postnummer.navn);
    assert(adresse.adgangsadresse.stormodtagerpostnummer===null, 'adresse.stormodtagerpostnummer forskellig: ' + adresse.adgangsadresse.stormodtagerpostnummer);
    assert(adresse.adgangsadresse.kommune.kode==="0101", 'adresse.kommune.nr forskellig: ' + adresse.adgangsadresse.kommune.kode);
    assert(adresse.adgangsadresse.kommune.navn==="København", 'adresse.kommune.navn forskellig: ' + adresse.adgangsadresse.kommune.navn);
    assert(adresse.adgangsadresse.ejerlav.kode==2000175, 'adresse.ejerlav.nr forskellig: ' + adresse.adgangsadresse.ejerlav.kode);
    assert(adresse.adgangsadresse.ejerlav.navn==="Utterslev, København", 'adresse.ejerlav.navn forskellig: ' + adresse.adgangsadresse.ejerlav.navn);
    assert(adresse.adgangsadresse.sogn.kode==="7060", 'adresse.sogn.nr forskellig: ' + adresse.adgangsadresse.sogn.kode);
    assert(adresse.adgangsadresse.sogn.navn==="Grøndal", 'adresse.sogn.navn i json og csv format forskellig. json: ' + adresse.adgangsadresse.sogn.navn);
    assert(adresse.adgangsadresse.region.kode==="1084", 'adresse.region.n forskellig: ' + adresse.adgangsadresse.region.kode);
    assert(adresse.adgangsadresse.region.navn==="Region Hovedstaden", 'adresse.region.navn forskellig: ' + adresse.adgangsadresse.region.navn);
    assert(adresse.adgangsadresse.retskreds.kode==="1102", 'adresse.retskreds.nr forskellig: ' + adresse.adgangsadresse.retskreds.kode);
    assert(adresse.adgangsadresse.retskreds.navn==="Retten på Frederiksberg", 'adresse.retskreds.navn forskellig: ' + adresse.adgangsadresse.retskreds.navn);
    assert(adresse.adgangsadresse.politikreds.kode==="1470", 'adresse.politikreds.nr forskellig: ' + adresse.adgangsadresse.politikreds.kode);
    assert(adresse.adgangsadresse.politikreds.navn==="Københavns Politi", 'adresse.politikreds.navn forskellig: ' + adresse.adgangsadresse.politikreds.navn);
    assert(adresse.adgangsadresse.opstillingskreds.kode==="0007", 'adresse.opstillingskreds.nr forskellig: ' + adresse.adgangsadresse.opstillingskreds.kode);
    assert(adresse.adgangsadresse.opstillingskreds.navn==="Brønshøj", 'adresse.opstillingskreds.navn forskellig: ' + adresse.adgangsadresse.opstillingskreds.navn);
    assert(adresse.adgangsadresse.esrejendomsnr==="242358", 'adresse.esrejendomsnr forskellig: ' + adresse.adgangsadresse.esrejendomsnr);
    assert(adresse.adgangsadresse.matrikelnr==="663", 'adresse.matrikelnr forskellig: ' + adresse.adgangsadresse.matrikelnr);

    assert(adresse.adgangsadresse.adgangspunkt.koordinater[0]==12.51085725, 'punkt.koordinater[0] forskellig: ' + adresse.adgangsadresse.adgangspunkt.koordinater[0]);
    assert(adresse.adgangsadresse.adgangspunkt.koordinater[1]==55.69839738, 'punkt.koordinater[1] forskellig: ' + adresse.adgangsadresse.adgangspunkt.koordinater[1]);
    assert(adresse.adgangsadresse.adgangspunkt.nøjagtighed==="A", 'punkt.nøjagtighed forskellig: ' + adresse.adgangsadresse.adgangspunkt.nøjagtighed);
    assert(adresse.adgangsadresse.adgangspunkt.kilde==5, 'punkt.kilde forskellig: ' + adresse.adgangsadresse.adgangspunkt.kilde);
    assert(adresse.adgangsadresse.adgangspunkt.tekniskstandard==="TD", 'punkt.tekniskstandard forskellig: ' + adresse.adgangsadresse.adgangspunkt.tekniskstandard);
    assert(adresse.adgangsadresse.adgangspunkt.tekstretning==200, 'punkt.tekstretning forskellig: ' + adresse.adgangsadresse.adgangspunkt.tekstretning);
    assert(adresse.adgangsadresse.adgangspunkt.ændret==="2002-04-05T00:00:00.000", 'punkt.adressepunktændringsdato forskellig: ' + adresse.adgangsadresse.adgangspunkt.ændret);
    assert(adresse.adgangsadresse.vejpunkt.koordinater[0]==12.51066198, 'punkt.koordinater[0] forskellig: ' + adresse.adgangsadresse.vejpunkt.koordinater[0]);
    assert(adresse.adgangsadresse.vejpunkt.koordinater[1]==55.69846171, 'punkt.koordinater[1] forskellig: ' + adresse.adgangsadresse.vejpunkt.koordinater[1]);
    assert(adresse.adgangsadresse.vejpunkt.nøjagtighed==="B", 'punkt.nøjagtighed forskellig: ' + adresse.adgangsadresse.vejpunkt.nøjagtighed);
    assert(adresse.adgangsadresse.vejpunkt.kilde=='Ekstern', 'punkt.kilde forskellig: ' + adresse.adgangsadresse.vejpunkt.kilde);
    assert(adresse.adgangsadresse.vejpunkt.tekniskstandard==="V0", 'punkt.tekniskstandard forskellig: ' + adresse.adgangsadresse.vejpunkt.tekniskstandard);
    assert(adresse.adgangsadresse.jordstykke.ejerlav.kode==2000175, 'jordstykke.ejerlav.kode forskellig: ' + adresse.adgangsadresse.jordstykke.ejerlav.kode);
    assert(adresse.adgangsadresse.jordstykke.matrikelnr==="663", 'jordstykke.matrikelnr forskellig: ' + adresse.adgangsadresse.jordstykke.matrikelnr);
    assert(adresse.adgangsadresse.jordstykke.esrejendomsnr==="242358", 'jordstykke.esrejendomsnr forskellig: ' + adresse.adgangsadresse.jordstykke.esrejendomsnr);
    assert(adresse.adgangsadresse.zone==="Byzone", 'Zone forskellig: ' + adresse.adgangsadresse.zone);
    assert(adresse.adgangsadresse.adgangspunkt.højde==24.1, 'Højde forskellig: ' + adresse.adgangsadresse.adgangspunkt.højde);
    assert(adresse.adgangsadresse.brofast===true, 'Brofast forskellig: ' + adresse.adgangsadresse.brofast);

    const vejopt= {};
    vejopt.url=adresse.adgangsadresse.vejstykke.href;
    vejopt.qs= {};
    vejopt.qs.cache= 'no-cache';
    vejopt.json= true;
    const vejrequest= rp(vejopt);

    const postopt= {};
    postopt.url=adresse.adgangsadresse.postnummer.href;
    postopt.qs= {};
    postopt.qs.cache= 'no-cache';
    postopt.json= true;
    const postrequest= rp(postopt);

    const komopt= {};
    komopt.url=adresse.adgangsadresse.kommune.href;
    komopt.qs= {};
    komopt.qs.cache= 'no-cache';
    komopt.json= true;
    const komrequest= rp(komopt);

    const sognopt= {};
    sognopt.url=adresse.adgangsadresse.sogn.href;
    sognopt.qs= {};
    sognopt.qs.cache= 'no-cache';
    sognopt.json= true;
    const sognrequest= rp(sognopt);

    const regionopt= {};
    regionopt.url=adresse.adgangsadresse.region.href;
    regionopt.qs= {};
    regionopt.qs.cache= 'no-cache';
    regionopt.json= true;
    const regionrequest= rp(regionopt);

    const retsopt= {};
    retsopt.url=adresse.adgangsadresse.retskreds.href;
    retsopt.qs= {};
    retsopt.qs.cache= 'no-cache';
    retsopt.json= true;
    const retsrequest= rp(retsopt);

    const polopt= {};
    polopt.url=adresse.adgangsadresse.politikreds.href;
    polopt.qs= {};
    polopt.qs.cache= 'no-cache';
    polopt.json= true;
    const polrequest= rp(polopt);

    const opsopt= {};
    opsopt.url=adresse.adgangsadresse.opstillingskreds.href;
    opsopt.qs= {};
    opsopt.qs.cache= 'no-cache';
    opsopt.json= true;
    const opsrequest= rp(opsopt);

    const afsopt= {};
    afsopt.url=adresse.adgangsadresse.afstemningsområde.href;
    afsopt.qs= {};
    afsopt.qs.cache= 'no-cache';
    afsopt.json= true;
    const afsrequest= rp(afsopt);

    const jordopt= {};
    jordopt.url=adresse.adgangsadresse.jordstykke.href;
    jordopt.qs= {};
    jordopt.qs.cache= 'no-cache';
    jordopt.json= true;
    const jordrequest= rp(jordopt);

    // at most 10 concurrent requests to avoid triggering 429 responses
    const [vejresponse, postresponse, komresponse, sognresponse,
      regionresponse, retsresponse, polresponse, opsresponse, afsresponse,
      jordresponse] =
      await Promise.all([vejrequest, postrequest, komrequest, sognrequest, regionrequest,
        retsrequest, polrequest, opsrequest, afsrequest, jordrequest]);


    const ngvej= {};
    ngvej.url=adresse.adgangsadresse.navngivenvej.href;
    ngvej.qs= {};
    ngvej.qs.cache= 'no-cache';
    ngvej.json= true;
    const ngvejrequest= rp(ngvej);

    const ngvejresponse = await ngvejrequest;

    assert(adresse.adgangsadresse.vejstykke.kode===vejresponse.kode,"Uoverenstemmelse i vejstykke");
    assert(adresse.adgangsadresse.postnummer.nr===postresponse.nr,"Uoverenstemmelse i postnummer");
    assert(adresse.adgangsadresse.kommune.kode===komresponse.kode,"Uoverenstemmelse i kommune");
    assert(adresse.adgangsadresse.sogn.kode===sognresponse.kode,"Uoverenstemmelse i sogn");
    assert(adresse.adgangsadresse.region.kode===regionresponse.kode,"Uoverenstemmelse i region");
    assert(adresse.adgangsadresse.retskreds.kode===retsresponse.kode,"Uoverenstemmelse i retskreds");
    assert(adresse.adgangsadresse.politikreds.kode===polresponse.kode,"Uoverenstemmelse i politikreds");
    assert(adresse.adgangsadresse.opstillingskreds.kode===opsresponse.kode,"Uoverenstemmelse i opstillingskreds")
    assert(adresse.adgangsadresse.afstemningsområde.kode===afsresponse.kode,"Uoverenstemmelse i afstemningsområde")
    assert(adresse.adgangsadresse.jordstykke.matrikelnr===jordresponse.matrikelnr,"Uoverenstemmelse i jordstykke (" + adresse.adgangsadresse.jordstykke.matrikelnr + ", " + jordresponse.matrikelnr + ")");
    assert(adresse.adgangsadresse.navngivenvej.id===ngvejresponse.id,"Uoverenstemmelse i jordstykke (" + adresse.adgangsadresse.navngivenvej.id + ", " + ngvejresponse.id + ")");

    function findBebyggelse(navn,type) {
      return function findBebyggelse(bebyggelse) {
        return bebyggelse.navn === navn && bebyggelse.type === type;
      }
    }

    const bydel= adresse.adgangsadresse.bebyggelser.find(findBebyggelse('Grøndal','bydel'));
    const by= adresse.adgangsadresse.bebyggelser.find(findBebyggelse('København', 'by'));

    assert(adresse.adgangsadresse.bebyggelser.length === 2, "Antal bebyggelsestyper != 2");

    assert(bydel, 'Mangler bydel Grøndal');
    assert(by, 'Mangler by København');

    const bydelopt= {};
    bydelopt.url= bydel.href;
    bydelopt.qs= {};
    bydelopt.qs.cache= 'no-cache';
    bydelopt.json= true;
    const bydelrequest= rp(bydelopt);

    const byopt= {};
    byopt.url= by.href;
    byopt.qs= {};
    byopt.qs.cache= 'no-cache';
    byopt.json= true;
    const byrequest= rp(byopt);

    const [bydelResponse, byResponse] = await  Promise.all([bydelrequest, byrequest]);
    assert(bydel.navn===bydelResponse.navn,"Uoverenstemmelse i bydel")
    assert(by.navn===byResponse.navn,"Uoverenstemmelse i by")
  });

  it("Samme indhold json og csv format", function(done){

    var optjson= {};
    optjson.baseUrl= host;
    optjson.url='adresser';
    optjson.qs= {};
    optjson.qs.cache= 'no-cache';
    optjson.qs.vejnavn= 'Rådhuspladsen';
    optjson.qs.husnr= '1';
    optjson.qs.postnr= '1550';
    var jsonrequest= rp(optjson);

    var optcsv= {};
    optcsv.baseUrl= host;
    optcsv.url=optjson.url;
    optcsv.qs= {};
    optcsv.qs.cache= optjson.qs.cache;
    optcsv.qs.vejnavn= optjson.qs.vejnavn;
    optcsv.qs.husnr= optjson.qs.husnr;
    optcsv.qs.postnr= optjson.qs.postnr;
    optcsv.qs.format= 'csv';
    var csvrequest= rp(optcsv);

    Promise.all([jsonrequest, csvrequest]).then(function (bodies) {
      var adresserjson= JSON.parse(bodies[0]);
      var adressejson= adresserjson[0];
      //console.log(adressejson);      
      csv.parse(bodies[1], {columns: true}, function (err, adressercsv) {
        var adressecsv= adressercsv[0];
        //console.log(adgangsadressecsv);
        assert(adressejson.id===adressecsv.id, 'Id i json og csv format forskellig. json: ' + adressejson.id + ', csv: ' + adressecsv.id);
        assert(adressejson.status==adressecsv.status, 'Status i json og csv format forskellig. json: |' + adressejson.status + '|, csv: |' + adressecsv.status + '|');
        assert(adressejson.kvhx===adressecsv.kvhx, 'kvh i json og csv format forskellig. json: ' + adressejson.kvhx + ', csv: ' + adressecsv.kvhx);
        assert(adressejson.historik.oprettet===adressecsv.oprettet, 'oprettet i json og csv format forskellig. json: |' + adressejson.historik.oprettet + '|, csv: |' + adressecsv.oprettet + '|');
        assert(adressejson.historik.ændret===adressecsv.ændret, 'ændret i json og csv format forskellig. json: ' + adressejson.historik.ændret + ', csv: ' + adressecsv.ændret);
        assert(adressejson.etage?adressejson.etage===adressecsv.etage:adressecsv.etage.length===0, 'etage i json og csv format forskellig. json: ' + adressejson.etage + ', csv: ' + adressecsv.etage);
        assert(adressejson.dør?adressejson.dør===adressecsv.dør:adressecsv.dør.length===0, 'dør i json og csv format forskellig. json: ' + adressejson.dør + ', csv: ' + adressecsv.dør);
        assert(adressejson.adgangsadresse.vejstykke.navn===adressecsv.vejnavn, 'adresse.vejstykke.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.navn + ', csv: ' + adressecsv.vejnavn);
        assert(adressejson.adgangsadresse.vejstykke.navn===optjson.qs.vejnavn, 'adresse.vejstykke.navn i json og søgekriterie forskellig. json: ' + adressejson.adgangsadresse.vejstykke.navn + ', søgekriterie: ' + optjson.qs.vejnavn);
        assert(adressejson.adgangsadresse.vejstykke.kode===adressecsv.vejkode, 'adresse.vejstykke.kode i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.kode + ', csv: ' + adressecsv.vejkode);
        assert(adressejson.adgangsadresse.vejstykke.adresseringsnavn===adressecsv.adresseringsvejnavn, 'adresse.vejstykke.adresseringsnavn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.adresseringsnavn + ', csv: ' + adressecsv.adresseringsvejnavn);
        assert(adressejson.adgangsadresse.husnr===adressecsv.husnr, 'adresse.husnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.husnr + ', csv: ' + adressecsv.husnr);
        assert(adressejson.adgangsadresse.husnr===optjson.qs.husnr, 'adresse.husnr i json og søgekriterie forskellig. json: ' + adressejson.adgangsadresse.husnr + ', søgekriterie: ' + optjson.qs.husnr);
        assert(adressejson.adgangsadresse.supplerendebynavn==adressecsv.supplerendebynavn||adressejson.adgangsadresse.supplerendebynavn===null&&adressecsv.supplerendebynavn=="", 'adresse.supplerendebynavn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.supplerendebynavn + ', csv: ' + adressecsv.supplerendebynavn);
        assert(adressejson.adgangsadresse.navngivenvej.id==adressecsv.navngivenvej_id, 'adresse.navngivenvejid i json og csv format forskellig. json: ' + adressejson.adgangsadresse.navngivenvej.id + ', csv: ' + adressecsv.navngivenvej_id);
        assert(adressejson.adgangsadresse.postnummer.nr===adressecsv.postnr, 'adresse.postnummer.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.postnummer.nr + ', csv: ' + adressecsv.postnr);
        assert(adressejson.adgangsadresse.postnummer.nr===optjson.qs.postnr, 'adresse.postnummer.nr i json og søgekriterie er forskellig. json: ' + adressejson.adgangsadresse.postnummer.nr + ', søgekriterie: ' + optjson.qs.postnr);
        assert(adressejson.adgangsadresse.postnummer.navn===adressecsv.postnrnavn, 'adresse.postnummer.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.postnummer.navn + ', csv: ' + adressecsv.postnrnavn);
        if (adressejson.adgangsadresse.stormodtagerpostnr) {
          assert(adressejson.adgangsadresse.stormodtagerpostnummer.nr===adressecsv.stormodtagerpostnr, 'adresse.stormodtagerpostnummer.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.stormodtagerpostnummer.nr + ', csv: ' + adressecsv.stormodtagerpostnr);
          assert(adressejson.adgangsadresse.stormodtagerpostnummer.navn===adressecsv.stormodtagerpostnrnavn, 'adresse.stormodtagerpostnummer.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.stormodtagerpostnummer.navn + ', csv: ' + adressecsv.stormodtagerpostnrnavn);
        }
        assert(adressejson.adgangsadresse.kommune.kode===adressecsv.kommunekode, 'adresse.kommune.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.kommune.kode + ', csv: ' + adressecsv.kommunekode);
        assert(adressejson.adgangsadresse.kommune.navn===adressecsv.kommunenavn, 'adresse.kommune.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.kommune.navn + ', csv: ' + adressecsv.kommunenavn);
        assert(adressejson.adgangsadresse.ejerlav.kode==adressecsv.ejerlavkode, 'adresse.ejerlav.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.ejerlav.kode + ', csv: ' + adressecsv.ejerlavkode);
        assert(adressejson.adgangsadresse.ejerlav.navn===adressecsv.ejerlavnavn, 'adresse.ejerlav.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.ejerlav.navn + ', csv: ' + adressecsv.ejerlavnavn);
        assert(adressejson.adgangsadresse.sogn.kode===adressecsv.sognekode, 'adresse.sogn.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.sogn.kode + ', csv: ' + adressecsv.sognekode);
        assert(adressejson.adgangsadresse.sogn.navn===adressecsv.sognenavn, 'adresse.sogn.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.sogn.navn + ', csv: ' + adressecsv.sognenavn);
        assert(adressejson.adgangsadresse.region.kode===adressecsv.regionskode, 'adresse.region.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.region.kode + ', csv: ' + adressecsv.regionskode);
        assert(adressejson.adgangsadresse.region.navn===adressecsv.regionsnavn, 'adresse.region.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.region.navn + ', csv: ' + adressecsv.regionsnavn);
        assert(adressejson.adgangsadresse.retskreds.kode===adressecsv.retskredskode, 'adresse.retskreds.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.retskreds.kode + ', csv: ' + adressecsv.retskredskode);
        assert(adressejson.adgangsadresse.retskreds.navn===adressecsv.retskredsnavn, 'adresse.retskreds.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.retskreds.navn + ', csv: ' + adressecsv.retskredsnavn);
        assert(adressejson.adgangsadresse.politikreds.kode===adressecsv.politikredskode, 'adresse.politikreds.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.politikreds.kode + ', csv: ' + adressecsv.politikredskode);
        assert(adressejson.adgangsadresse.politikreds.navn===adressecsv.politikredsnavn, 'adresse.politikreds.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.politikreds.navn + ', csv: ' + adressecsv.politikredsnavn);
        assert(adressejson.adgangsadresse.opstillingskreds.kode===adressecsv.opstillingskredskode, 'adresse.opstillingskreds.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.kode + ', csv: ' + adressecsv.opstillingskredskode);
        assert(adressejson.adgangsadresse.opstillingskreds.navn===adressecsv.opstillingskredsnavn, 'adresse.opstillingskreds.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.navn + ', csv: ' + adressecsv.retskredsnavn);
        assert(adressejson.adgangsadresse.opstillingskreds.kode===adressecsv.opstillingskredskode, 'adresse.opstillingskreds.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.kode + ', csv: ' + adressecsv.opstillingskredskode);
        assert(adressejson.adgangsadresse.opstillingskreds.navn===adressecsv.opstillingskredsnavn, 'adresse.opstillingskreds.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.navn + ', csv: ' + adressecsv.retskredsnavn);
        assert(adressejson.adgangsadresse.esrejendomsnr===adressecsv.esrejendomsnr, 'adresse.esrejendomsnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.esrejendomsnr + ', csv: ' + adressecsv.esrejendomsnr);
        assert(adressejson.adgangsadresse.matrikelnr===adressecsv.matrikelnr, 'adresse.matrikelnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.matrikelnr + ', csv: ' + adressecsv.matrikelnr);
        
        assert(adressejson.adgangsadresse.adgangspunkt.koordinater[0]==adressecsv.wgs84koordinat_længde, 'punkt.koordinater[0] i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.koordinater[0] + ', csv: ' + adressecsv.wgs84koordinat_længde);
        assert(adressejson.adgangsadresse.adgangspunkt.koordinater[1]==adressecsv.wgs84koordinat_bredde, 'punkt.koordinater[1] i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.koordinater[1] + ', csv: ' + adressecsv.wgs84koordinat_bredde);
        assert(adressejson.adgangsadresse.adgangspunkt.nøjagtighed===adressecsv.nøjagtighed, 'punkt.nøjagtighed i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.nøjagtighed + ', csv: ' + adressecsv.nøjagtighed);
        assert(adressejson.adgangsadresse.adgangspunkt.kilde==adressecsv.kilde, 'punkt.kilde i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.kilde + ', csv: ' + adressecsv.kilde);
        assert(adressejson.adgangsadresse.adgangspunkt.tekniskstandard===adressecsv.tekniskstandard, 'punkt.tekniskstandard i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.tekniskstandard + ', csv: ' + adressecsv.tekniskstandard);
        assert(adressejson.adgangsadresse.adgangspunkt.tekstretning==adressecsv.tekstretning, 'punkt.tekstretning i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.tekstretning + ', csv: ' + adressecsv.tekstretning);
        assert(adressejson.adgangsadresse.adgangspunkt.ændret===adressecsv.adressepunktændringsdato, 'punkt.adressepunktændringsdato i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.ændret + ', csv: ' + adressecsv.adressepunktændringsdato);
        assert(adressejson.adgangsadresse.vejpunkt.koordinater[0]==adressecsv.vejpunkt_x, 'punkt.koordinater[0] i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.koordinater[0] + ', csv: ' + adressecsv.vejpunkt_x);
        assert(adressejson.adgangsadresse.vejpunkt.koordinater[1]==adressecsv.vejpunkt_y, 'punkt.koordinater[1] i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.koordinater[1] + ', csv: ' + adressecsv.vejpunkt_y);
        assert(adressejson.adgangsadresse.vejpunkt.nøjagtighed===adressecsv.vejpunkt_nøjagtighed, 'punkt.nøjagtighed i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.nøjagtighed + ', csv: ' + adressecsv.vejpunkt_nøjagtighed);
        assert(adressejson.adgangsadresse.vejpunkt.kilde==adressecsv.vejpunkt_kilde, 'punkt.kilde i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.kilde + ', csv: ' + adressecsv.vejpunkt_kilde);
        assert(adressejson.adgangsadresse.vejpunkt.tekniskstandard===adressecsv.vejpunkt_tekniskstandard, 'punkt.tekniskstandard i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.tekniskstandard + ', csv: ' + adressecsv.vejpunkt_tekniskstandard);
        assert(adressejson.adgangsadresse.adgangspunkt.tekstretning==adressecsv.tekstretning, 'punkt.tekstretning i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.tekstretning + ', csv: ' + adressecsv.tekstretning);
        assert(adressejson.adgangsadresse.jordstykke.ejerlav.kode==adressecsv.jordstykke_ejerlavkode, 'jordstykke.ejerlav.kode i json og csv format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.ejerlav.kode + ', csv: ' + adressecsv.jordstykke_ejerlavkode);
        assert(adressejson.adgangsadresse.jordstykke.matrikelnr===adressecsv.jordstykke_matrikelnr, 'jordstykke.matrikelnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.matrikelnr + ', csv: ' + adressecsv.jordstykke_matrikelnr);
        assert(adressejson.adgangsadresse.jordstykke.esrejendomsnr===adressecsv.jordstykke_esrejendomsnr, 'jordstykke.esrejendomsnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.esrejendomsnr + ', csv: ' + adressecsv.jordstykke_esrejendomsnr);
        assert(adressejson.adgangsadresse.zone===adressecsv.zone, 'Zone i json og csv format forskellig. json: ' + adressejson.adgangsadresse.zone + ', csv: ' + adressecsv.zone);
        assert(adressejson.adgangsadresse.adgangspunkt.højde==adressecsv.højde, 'Højde i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.højde + ', csv: ' + adressecsv.højde);
        done();
      });
    });
  });

  it("Samme indhold json og geojson format", function(done){

    var optjson= {};
    optjson.baseUrl= host;
    optjson.url='adresser';
    optjson.qs= {};
    optjson.qs.cache= 'no-cache';
    optjson.qs.vejnavn= 'Rådhuspladsen';
    optjson.qs.husnr= '1';
    optjson.qs.postnr= '1550';
    var jsonrequest= rp(optjson);

    var optgeojson= {};
    optgeojson.baseUrl= host;
    optgeojson.url=optjson.url;
    optgeojson.qs= {};
    optgeojson.qs.cache= optjson.qs.cache;
    optgeojson.qs.vejnavn= optjson.qs.vejnavn;
    optgeojson.qs.husnr= optjson.qs.husnr;
    optgeojson.qs.postnr= optjson.qs.postnr;
    optgeojson.qs.format= 'geojson';
    var geojsonrequest= rp(optgeojson);

    Promise.all([jsonrequest, geojsonrequest]).then(function (bodies) {      
      try {
        var adresserjson= JSON.parse(bodies[0]);
        var adressejson= adresserjson[0];
        //console.log(adressejson);      
        var adressergeojson= JSON.parse(bodies[1]);
        var adressegeojson= adressergeojson.features[0].properties;
        //console.log(adgangsadressegeojson);
        assert(adressejson.id===adressegeojson.id, 'Id i json og geojson format forskellig. json: ' + adressejson.id + ', geojson: ' + adressegeojson.id);
        assert(adressejson.status==adressegeojson.status, 'Status i json og geojson format forskellig. json: |' + adressejson.status + '|, geojson: |' + adressegeojson.status + '|');
        assert(adressejson.kvhx===adressegeojson.kvhx, 'kvh i json og geojson format forskellig. json: ' + adressejson.kvhx + ', geojson: ' + adressegeojson.kvhx);
        assert(adressejson.historik.oprettet===adressegeojson.oprettet, 'oprettet i json og geojson format forskellig. json: |' + adressejson.historik.oprettet + '|, geojson: |' + adressegeojson.oprettet + '|');
        assert(adressejson.historik.ændret===adressegeojson.ændret, 'ændret i json og geojson format forskellig. json: ' + adressejson.historik.ændret + ', geojson: ' + adressegeojson.ændret);
        assert(adressejson.etage===adressegeojson.etage, 'etage i json og geojson format forskellig. json: ' + adressejson.etage + ', geojson: ' + adressegeojson.etage);
        assert(adressejson.dør===adressegeojson.dør, 'dør i json og geojson format forskellig. json: ' + adressejson.dør + ', geojson: ' + adressegeojson.dør);
        assert(adressejson.adgangsadresse.vejstykke.navn===adressegeojson.vejnavn, 'adresse.vejstykke.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.navn + ', geojson: ' + adressegeojson.vejnavn);
        assert(adressejson.adgangsadresse.vejstykke.navn===optjson.qs.vejnavn, 'adresse.vejstykke.navn i json og søgekriterie forskellig. json: ' + adressejson.adgangsadresse.vejstykke.navn + ', søgekriterie: ' + optjson.qs.vejnavn);
        assert(adressejson.adgangsadresse.vejstykke.kode===adressegeojson.vejkode, 'adresse.vejstykke.kode i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.kode + ', geojson: ' + adressegeojson.vejkode);
        assert(adressejson.adgangsadresse.vejstykke.adresseringsnavn===adressegeojson.adresseringsvejnavn, 'adresse.vejstykke.adresseringsnavn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.adresseringsnavn + ', geojson: ' + adressegeojson.adresseringsvejnavn);
        assert(adressejson.adgangsadresse.husnr===adressegeojson.husnr, 'adresse.husnr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.husnr + ', geojson: ' + adressegeojson.husnr);
        assert(adressejson.adgangsadresse.husnr===optjson.qs.husnr, 'adresse.husnr i json og søgekriterie forskellig. json: ' + adressejson.adgangsadresse.husnr + ', søgekriterie: ' + optjson.qs.husnr);
        assert(adressejson.adgangsadresse.supplerendebynavn==adressegeojson.supplerendebynavn||adressejson.adgangsadresse.supplerendebynavn===null&&adressegeojson.supplerendebynavn=="", 'adresse.supplerendebynavn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.supplerendebynavn + ', geojson: ' + adressegeojson.supplerendebynavn);
        assert(adressejson.adgangsadresse.navngivenvej.id==adressegeojson.navngivenvej_id, 'adresse.navngivenvejid i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.navngivenvej.id + ', geoson: ' + adressegeojson.navngivenvej_id);
        assert(adressejson.adgangsadresse.postnummer.nr===adressegeojson.postnr, 'adresse.postnummer.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.postnummer.nr + ', geojson: ' + adressegeojson.postnr);
        assert(adressejson.adgangsadresse.postnummer.nr===optjson.qs.postnr, 'adresse.postnummer.nr i json og søgekriterie er forskellig. json: ' + adressejson.adgangsadresse.postnummer.nr + ', søgekriterie: ' + optjson.qs.postnr);
        assert(adressejson.adgangsadresse.postnummer.navn===adressegeojson.postnrnavn, 'adresse.postnummer.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.postnummer.navn + ', geojson: ' + adressegeojson.postnrnavn);
        if (adressejson.adgangsadresse.stormodtagerpostnr) {
          assert(adressejson.adgangsadresse.stormodtagerpostnummer.nr===adressegeojson.stormodtagerpostnr, 'adresse.stormodtagerpostnummer.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.stormodtagerpostnummer.nr + ', geojson: ' + adressegeojson.stormodtagerpostnr);
          assert(adressejson.adgangsadresse.stormodtagerpostnummer.navn===adressegeojson.stormodtagerpostnrnavn, 'adresse.stormodtagerpostnummer.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.stormodtagerpostnummer.navn + ', geojson: ' + adressegeojson.stormodtagerpostnrnavn);
        }
        assert(adressejson.adgangsadresse.kommune.kode===adressegeojson.kommunekode, 'adresse.kommune.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.kommune.kode + ', geojson: ' + adressegeojson.kommunekode);
        assert(adressejson.adgangsadresse.kommune.navn===adressegeojson.kommunenavn, 'adresse.kommune.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.kommune.navn + ', geojson: ' + adressegeojson.kommunenavn);
        assert(adressejson.adgangsadresse.ejerlav.kode==adressegeojson.ejerlavkode, 'adresse.ejerlav.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.ejerlav.kode + ', geojson: ' + adressegeojson.ejerlavkode);
        assert(adressejson.adgangsadresse.ejerlav.navn===adressegeojson.ejerlavnavn, 'adresse.ejerlav.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.ejerlav.navn + ', geojson: ' + adressegeojson.ejerlavnavn);
        assert(adressejson.adgangsadresse.sogn.kode===adressegeojson.sognekode, 'adresse.sogn.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.sogn.kode + ', geojson: ' + adressegeojson.sognekode);
        assert(adressejson.adgangsadresse.sogn.navn===adressegeojson.sognenavn, 'adresse.sogn.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.sogn.navn + ', geojson: ' + adressegeojson.sognenavn);
        assert(adressejson.adgangsadresse.region.kode===adressegeojson.regionskode, 'adresse.region.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.region.kode + ', geojson: ' + adressegeojson.regionskode);
        assert(adressejson.adgangsadresse.region.navn===adressegeojson.regionsnavn, 'adresse.region.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.region.navn + ', geojson: ' + adressegeojson.regionsnavn);
        assert(adressejson.adgangsadresse.retskreds.kode===adressegeojson.retskredskode, 'adresse.retskreds.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.retskreds.kode + ', geojson: ' + adressegeojson.retskredskode);
        assert(adressejson.adgangsadresse.retskreds.navn===adressegeojson.retskredsnavn, 'adresse.retskreds.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.retskreds.navn + ', geojson: ' + adressegeojson.retskredsnavn);
        assert(adressejson.adgangsadresse.politikreds.kode===adressegeojson.politikredskode, 'adresse.politikreds.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.politikreds.kode + ', geojson: ' + adressegeojson.politikredskode);
        assert(adressejson.adgangsadresse.politikreds.navn===adressegeojson.politikredsnavn, 'adresse.politikreds.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.politikreds.navn + ', geojson: ' + adressegeojson.politikredsnavn);
        assert(adressejson.adgangsadresse.opstillingskreds.kode===adressegeojson.opstillingskredskode, 'adresse.opstillingskreds.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.kode + ', geojson: ' + adressegeojson.opstillingskredskode);
        assert(adressejson.adgangsadresse.opstillingskreds.navn===adressegeojson.opstillingskredsnavn, 'adresse.opstillingskreds.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.navn + ', geojson: ' + adressegeojson.retskredsnavn);
        assert(adressejson.adgangsadresse.opstillingskreds.kode===adressegeojson.opstillingskredskode, 'adresse.opstillingskreds.nr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.kode + ', geojson: ' + adressegeojson.opstillingskredskode);
        assert(adressejson.adgangsadresse.opstillingskreds.navn===adressegeojson.opstillingskredsnavn, 'adresse.opstillingskreds.navn i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.navn + ', geojson: ' + adressegeojson.retskredsnavn);
        assert(adressejson.adgangsadresse.esrejendomsnr===adressegeojson.esrejendomsnr, 'adresse.esrejendomsnr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.esrejendomsnr + ', geojson: ' + adressegeojson.esrejendomsnr);
        assert(adressejson.adgangsadresse.matrikelnr===adressegeojson.matrikelnr, 'adresse.matrikelnr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.matrikelnr + ', geojson: ' + adressegeojson.matrikelnr);
        
        assert(adressejson.adgangsadresse.adgangspunkt.koordinater[0]===adressegeojson.wgs84koordinat_længde, 'punkt.koordinater[0] i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.koordinater[0] + ', geojson: ' + adressegeojson.wgs84koordinat_længde);
        assert(adressejson.adgangsadresse.adgangspunkt.koordinater[1]===adressegeojson.wgs84koordinat_bredde, 'punkt.koordinater[1] i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.koordinater[1] + ', geojson: ' + adressegeojson.wgs84koordinat_bredde);
        assert(adressejson.adgangsadresse.adgangspunkt.nøjagtighed===adressegeojson.nøjagtighed, 'punkt.nøjagtighed i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.nøjagtighed + ', geojson: ' + adressegeojson.nøjagtighed);
        assert(adressejson.adgangsadresse.adgangspunkt.kilde===adressegeojson.kilde, 'punkt.kilde i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.kilde + ', geojson: ' + adressegeojson.kilde);
        assert(adressejson.adgangsadresse.adgangspunkt.tekniskstandard===adressegeojson.tekniskstandard, 'punkt.tekniskstandard i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.tekniskstandard + ', geojson: ' + adressegeojson.tekniskstandard);
        assert(adressejson.adgangsadresse.adgangspunkt.tekstretning===adressegeojson.tekstretning, 'punkt.tekstretning i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.tekstretning + ', geojson: ' + adressegeojson.tekstretning);
        assert(adressejson.adgangsadresse.adgangspunkt.ændret===adressegeojson.adressepunktændringsdato, 'punkt.adressepunktændringsdato i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.ændret + ', geojson: ' + adressegeojson.adressepunktændringsdato);
        assert(adressejson.adgangsadresse.vejpunkt.koordinater[0]===adressegeojson.vejpunkt_x, 'punkt.koordinater[0] i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.koordinater[0] + ', geojson: ' + adressegeojson.vejpunkt_x);
        assert(adressejson.adgangsadresse.vejpunkt.koordinater[1]===adressegeojson.vejpunkt_y, 'punkt.koordinater[1] i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.koordinater[1] + ', geojson: ' + adressegeojson.vejpunkt_y);
        assert(adressejson.adgangsadresse.vejpunkt.nøjagtighed===adressegeojson.vejpunkt_nøjagtighed, 'punkt.nøjagtighed i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.nøjagtighed + ', geojson: ' + adressegeojson.vejpunkt_nøjagtighed);
        assert(adressejson.adgangsadresse.vejpunkt.kilde===adressegeojson.vejpunkt_kilde, 'punkt.kilde i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.kilde + ', geojson: ' + adressegeojson.vejpunkt_kilde);
        assert(adressejson.adgangsadresse.vejpunkt.tekniskstandard===adressegeojson.vejpunkt_tekniskstandard, 'punkt.tekniskstandard i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.vejpunkt.tekniskstandard + ', geojson: ' + adressegeojson.vejpunkt_tekniskstandard);
        assert(adressejson.adgangsadresse.jordstykke.ejerlav.kode==adressegeojson.jordstykke_ejerlavkode, 'jordstykke.ejerlav.kode i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.ejerlav.kode + ', geojson: ' + adressegeojson.jordstykke_ejerlavkode);
        assert(adressejson.adgangsadresse.jordstykke.matrikelnr===adressegeojson.jordstykke_matrikelnr, 'jordstykke.matrikelnr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.matrikelnr + ', geojson: ' + adressegeojson.jordstykke_matrikelnr);
        assert(adressejson.adgangsadresse.jordstykke.esrejendomsnr===adressegeojson.jordstykke_esrejendomsnr, 'jordstykke.esrejendomsnr i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.esrejendomsnr + ', geojson: ' + adressegeojson.jordstykke_esrejendomsnr);
        assert(adressejson.adgangsadresse.zone===adressegeojson.zone, 'Zone i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.zone + ', geojson: ' + adressegeojson.zone);
        assert(adressejson.adgangsadresse.adgangspunkt.højde===adressegeojson.højde, 'Højde i json og geojson format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.højde + ', geojson: ' + adressegeojson.højde);
        done();
      }
      catch (e) {
        console.log('catch:'+e);
        done(e);
      }
    }).catch((err) => {
      done(err);
    });

  })

  it("Samme indhold mini og normal format", function(done){

    var optjson= {};
    optjson.baseUrl= host;
    optjson.url='adresser';
    optjson.qs= {};
    optjson.qs.cache= 'no-cache';
    optjson.qs.vejnavn= 'Rådhuspladsen';
    optjson.qs.husnr= '1';
    optjson.qs.postnr= '1550';
    // optjson.resolveWithFullResponse= true;
    var jsonrequest= rp(optjson);

    var optmini= {};
    optmini.baseUrl= host;
    optmini.url=optjson.url;
    optmini.qs= {};
    optmini.qs.cache= optjson.qs.cache;
    optmini.qs.vejnavn= optjson.qs.vejnavn;
    optmini.qs.husnr= optjson.qs.husnr;
    optmini.qs.postnr= optjson.qs.postnr;
    optmini.qs.struktur= 'mini';
    // optmini.resolveWithFullResponse= true;
    var minirequest= rp(optmini);

    Promise.all([jsonrequest, minirequest]).then(function (bodies) {
      try {
        var adresserjson= JSON.parse(bodies[0]);
        var adressejson= adresserjson[0];
        var adressermini= JSON.parse(bodies[1]);
        var adressemini= adressermini[0];
    
        assert(adressejson.id===adressemini.id, 'Id i json og mini format forskellig. json: ' + adressejson.id + ', mini: ' + adressemini.id);
        assert(adressejson.status==adressemini.status, 'Status i json og mini format forskellig. json: |' + adressejson.status + '|, mini: |' + adressemini.status + '|');
        assert(adressejson.etage===adressemini.etage, 'etage i json og mini format forskellig. json: ' + adressejson.etage + ', mini: ' + adressemini.etage);
        assert(adressejson.dør===adressemini.dør, 'dør i json og mini format forskellig. json: ' + adressejson.dør + ', mini: ' + adressemini.dør);      
        assert(adressejson.adgangsadresse.id===adressemini.adgangsadresseid, 'adgangsadresseid i json og mini format forskellig. json: ' + adressejson.adgangsadresse.id + ', mini: ' + adressemini.adgangsadresseid);
        assert(adressejson.adgangsadresse.vejstykke.navn===adressemini.vejnavn, 'adresse.vejstykke.navn i json og mini format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.navn + ', mini: ' + adressemini.vejnavn);
        assert(adressejson.adgangsadresse.vejstykke.navn===optjson.qs.vejnavn, 'adresse.vejstykke.navn i json og søgekriterie forskellig. json: ' + adressejson.adgangsadresse.vejstykke.navn + ', søgekriterie: ' + optjson.qs.vejnavn);
        assert(adressejson.adgangsadresse.vejstykke.kode===adressemini.vejkode, 'adresse.vejstykke.kode i json og mini format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.kode + ', mini: ' + adressemini.vejkode);
        assert(adressejson.adgangsadresse.husnr===adressemini.husnr, 'adresse.husnr i json og mini format forskellig. json: ' + adressejson.adgangsadresse.husnr + ', mini: ' + adressemini.husnr);
        assert(adressejson.adgangsadresse.husnr===optjson.qs.husnr, 'adresse.husnr i json og søgekriterie forskellig. json: ' + adressejson.adgangsadresse.husnr + ', søgekriterie: ' + optjson.qs.husnr);
        assert(adressejson.adgangsadresse.supplerendebynavn==adressemini.supplerendebynavn||adressejson.adgangsadresse.supplerendebynavn===null&&adressemini.supplerendebynavn=="", 'adresse.supplerendebynavn i json og mini format forskellig. json: ' + adressejson.adgangsadresse.supplerendebynavn + ', mini: ' + adressemini.supplerendebynavn);
        assert(adressejson.adgangsadresse.postnummer.nr===adressemini.postnr, 'adresse.postnummer.nr i json og mini format forskellig. json: |' + adressejson.adgangsadresse.postnummer.nr + '|, mini: |' + adressemini.postnr + '|');
        assert(adressejson.adgangsadresse.postnummer.nr===optjson.qs.postnr, 'adresse.postnummer.nr i json og søgekriterie er forskellig. json: ' + adressejson.adgangsadresse.postnummer.nr + ', søgekriterie: ' + optjson.qs.postnr);
        assert(adressejson.adgangsadresse.postnummer.navn===adressemini.postnrnavn, 'adresse.postnummer.navn i json og mini format forskellig. json: ' + adressejson.adgangsadresse.postnummer.navn + ', mini: ' + adressemini.postnrnavn);
        assert(adressejson.adgangsadresse.kommune.kode===adressemini.kommunekode, 'adresse.kommune.nr i json og mini format forskellig. json: ' + adressejson.adgangsadresse.kommune.kode + ', mini: ' + adressemini.kommunekode);
        assert(adressejson.adgangsadresse.adgangspunkt.koordinater[0]===adressemini.x, 'punkt.koordinater[0] i json og mini format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.koordinater[0] + ', mini: ' + adressemini.x);
        assert(adressejson.adgangsadresse.adgangspunkt.koordinater[1]===adressemini.y, 'punkt.koordinater[1] i json og mini format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.koordinater[1] + ', mini: ' + adressemini.y);

        done();
      }
      catch (e) {
        console.log('catch:'+e);
        done(e);
      }
    }).catch((err) => {
      done(err);
    });;

  })

});

describe('Vejnavnesøgning', function(){

  it('q=a.*', function(done){
    request(encodeURI(host+'/vejnavne?q=a.*&cache=no-cache'), function (error, response, body) {
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
      var vejnavne= JSON.parse(body);
      var vejnavn= vejnavne[0];
      let line= util.format("Vejnavn: %s", vejnavn);
      //console.log(line);
	    done();
	  })
	})


  it("Kan håndtere ë", function(done){
    request(encodeURI(host+"/vejnavne?navn=Tove Maës Vej&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      //console.log(body);
      var vejnavne= JSON.parse(body);
      assert.equal(vejnavne.length,1);   
      done();
    })
  })

  it("Søgning med kommunekode", async function () {
    let options = {};
    options.baseUrl = host;
    options.url = 'vejnavne';
    options.qs = {};
    options.qs.cache = 'no-cache';
    options.qs.q = "slesv*";
    options.qs.kommunekode = "0101";
    options.resolveWithFullResponse = true;
    let response = await rp(options);
    assert(response.statusCode === 200, "Http status code != 200");
    let vejnavne = JSON.parse(response.body);
    assert(vejnavne.length === 1, "Der er ikke fundet ét vejnavn, men  " + vejnavne.length);
    assert(vejnavne[0].postnumre.length === 1, "Der er ikke fundet ét postnummer, men  " + vejnavne[0].postnumre.length);
  });

});

describe('Vejstykkesøgning', function(){

  it("q=ro'*", function(done){
    request(encodeURI(host+"/vejstykker?q=ro'*&cache=no-cache"), function (error, response, body) {
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
      var vejnavne= JSON.parse(body);
      var vejnavn= vejnavne[0];
      let line= util.format("Vejnavn: %s", vejnavn);
      //console.log(line);
	    done();
	  })
	})

  it("Fuzzy søgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/vejstykker';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.q= 'rante mester vaj';
    options.qs.fuzzy= 'true';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var vejstykker= JSON.parse(response.body);
      assert(vejstykker.length > 0, "Antal vejstykker = 0 (" + vejstykker.length + ")");
      assert(vejstykker[0].navn === 'Rentemestervej', 'Finder ikke Rentemestervej');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });


  it("Naboer", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/vejstykker/101/6100/naboer';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.format= 'geojson';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var vejstykker= JSON.parse(response.body);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Navngiven vej id", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/vejstykker';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.navngivenvej_id= 'c0f08a1a-b9a4-465b-8372-d12babe7fbd6';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var vejstykker= JSON.parse(response.body);
      //console.log(util.inspect(vejstykker));
      assert(vejstykker.length >= 5, "Antal vejstykker < 5 (" + vejstykker.length + ")");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("reverse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/vejstykker/reverse';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.x= 12.510814300000002;
    options.qs.y= 55.69837060000;
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var vejstykker= JSON.parse(response.body);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});

describe('Unik vejstykke', function(){

  it("Finsensvej, Frederiksberg", function(done){
    request(encodeURI(host+"/vejstykker?kommunekode=0147&kode=0238&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var vejnavne= JSON.parse(body);
      assert.equal(vejnavne.length,1); 
      done();
    })
  })

});

describe('Navngiven vej', function(){

  it("navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='navngivneveje';
    options.qs= {};
    options.qs.navn= 'Holbækmotorvejen';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var navngivneveje= JSON.parse(response.body);
      assert(navngivneveje.length>=1, "Der er burde være en: "+navngivneveje.length);
      assert(navngivneveje[0].vejstykker.length>=5, "Der er burde være mindst 5 vejstykker: "+navngivneveje[0].vejstykker.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("postnr", async function(){
    var options= {};
    options.baseUrl= host;
    options.url='navngivneveje';
    options.qs= {};
    let postnr= '2400';
    options.qs.postnr= postnr;
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    let response= await rp(options);
    assert(response.statusCode===200, "Http status code != 200");
    var navngivneveje= JSON.parse(response.body);
    assert(navngivneveje.length>20, "Der er burde være flere navngivne veje: " + navngivneveje.length);
    let udenpostnr= _.filter(navngivneveje, (nv) => {return _.find(nv.postnumre, (postnummer) => {return postnummer.nr === postnr}) === undefined});
    assert(udenpostnr.length===0, "Alle navngivne veje burde rumme postnummer  "+postnr);
  });

  it("postnr og vejnavn", async function(){
    var options= {};
    options.baseUrl= host;
    options.url='navngivneveje';
    options.qs= {};
    let postnr= '2500';
    options.qs.postnr= postnr;
    options.qs.navn= 'Holbækmotorvejen';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    let response= await rp(options);
    assert(response.statusCode===200, "Http status code != 200");
    var navngivneveje= JSON.parse(response.body);
    assert(navngivneveje.length===1, "Der er burde være en: "+navngivneveje.length);
    assert(navngivneveje[0].postnumre.length===10, "Der er burde være 10 postnumre: "+navngivneveje[0].postnumre.length);
    let udenpostnr= _.filter(navngivneveje, (nv) => {return _.find(nv.postnumre, (postnummer) => {return postnummer.nr === postnr}) === undefined});
    assert(udenpostnr.length===0, "Alle navngivne veje burde rumme postnummer  "+postnr);
  });


  it("cirkel", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/navngivneveje';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.cirkel= "12.510814300000002,55.69837060000,50";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var navngivneveje= JSON.parse(response.body);
      assert(navngivneveje.length === 2, "Ikke to navngivneveje");
      //console.log(navngivneveje[0].navn);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("polygon", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/navngivneveje';
    options.qs= {};
    options.qs.cache= 'no-cache'; 
    options.qs.polygon= '[[[8.91172755486213, 56.59274886518194],[8.948437235894998, 56.57437007272818],[8.876752381627279, 56.579839531262145],[8.91172755486213, 56.59274886518194]]]';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var navngivneveje= JSON.parse(response.body);
      assert(navngivneveje.length > 2, "Ikke flere end to navngivneveje");
      //console.log(navngivneveje[0].navn);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

   
  it("reverse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/navngivneveje';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.x= 12.510814300000002;
    options.qs.y= 55.69837060000;
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var navngivneveje= JSON.parse(response.body);
      assert(navngivneveje.length > 0, "ingen nærmeste navngiven vej");
      //console.log(navngivneveje[0].navn);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("naboer", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/navngivneveje/d05d536a-febb-49f1-bcb8-8a2849e31fe2/naboer';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var navngivneveje= JSON.parse(response.body);
      assert(navngivneveje.length === 3, "Der burde være tre naboveje");
      //console.log(navngivneveje[0].navn);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("gemometri=begge", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/navngivneveje';
    options.qs= {};
    options.qs.kommunekode= 217;
    options.qs.format= "geojson";
    options.qs.geometri= "begge";
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var navngivneveje= JSON.parse(response.body);
      assert(navngivneveje.features.length > 0, "Der burde være navngivne veje");
      let vejnavneområde= false
        , vejnavnelinje= false;
      for (var i= 0; i<navngivneveje.features.length; i++) {
        let nv= navngivneveje.features[i];
        if (nv.properties.beliggenhed_geometritype === "vejnavneområde" && nv.geometry.type === 'Polygon') {
          vejnavneområde= true;
        }
        if (nv.properties.beliggenhed_geometritype === "vejnavnelinje" && nv.geometry.type === 'MultiLineString') {
          vejnavnelinje= true;
        }
      }
      assert(vejnavneområde && vejnavnelinje, "Der var ikke både vejnavneområde og vejnavnelinje");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});

describe('Supplerendebynavnsøgning', function(){

  it("q=lille*", function(done){
    request(encodeURI(host+"/supplerendebynavne?q=lille*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      //console.log(util.inspect(bynavne));
      var bynavn= bynavne[0].navn;

      //console.log(bynavn);
      assert(bynavn.search('Lille')!=-1||bynavn.search('Ll')!=-1,"Navn indeholder ikke lille")
      done();
    })
  })

});

describe('Supplerende bynavne 2', function(){

  it("supplerendebynavne2reverse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='supplerendebynavne2';
    options.qs= {};
    options.qs.x= 8.91172755486213;
    options.qs.y= 56.59274886518194;
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var supplerendebynavne= JSON.parse(response.body);
      assert(supplerendebynavne.length>=1, "Der er burde være mindst 1: "+supplerendebynavne.length);
      // supplerendebynavne.forEach(function(element) {
      //   console.log(element.primærtnavn);
      // });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });


  it("polygon", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='supplerendebynavne2';
    options.qs= {};
    options.qs.polygon= '[[[8.91172755486213, 56.59274886518194],[8.948437235894998, 56.57437007272818],[8.876752381627279, 56.579839531262145],[8.91172755486213, 56.59274886518194]]]';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var supplerendebynavne= JSON.parse(response.body);
      assert(supplerendebynavne.length>=1, "Der er burde være mindst 1: "+supplerendebynavne.length);
      // supplerendebynavne.forEach(function(element) {
      //   console.log(element.primærtnavn);
      // });

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='supplerendebynavne2';
    options.qs= {};
    options.qs.navn= 'Solrød';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var supplerendebynavne= JSON.parse(response.body);
      assert(supplerendebynavne.length===1, "Der er burde være en: "+supplerendebynavne.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("cirkel", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='supplerendebynavne2';
    options.qs= {};
    options.qs.cirkel= '8.91172755486213,56.59274886518194,2000';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var supplerendebynavne= JSON.parse(response.body);
      assert(supplerendebynavne.length>=1, "Der er burde være mindst 1: "+supplerendebynavne.length);
      // supplerendebynavne.forEach(function(element) {
      //   console.log(element.primærtnavn);
      // });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("nærmeste", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='supplerendebynavne2';
    options.qs= {};
    options.qs.x= 9.194696328972807;
    options.qs.y=  56.16942630302476;
    options.qs.nærmeste= true;
    options.qs.undertype= 'mindesten';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var supplerendebynavne= JSON.parse(response.body);
      assert(supplerendebynavne.length===1, "Der er burde kun være 1: "+supplerendebynavne.length);
      assert(supplerendebynavne[0].navn==='Hammerum', "Det er burde kun være Hammerum: "+supplerendebynavne[0].navn);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});

describe('Postnummersøgning', function(){

  function erIkkeStormodtager(element, index, array) { 
    return element.stormodtageradresser === null; 
  } 
  
  it("stormodtagerpostnumre skal ikke med som default", function(done){
    request(encodeURI(host+"/postnumre?cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var postnumre= JSON.parse(body);
      assert(postnumre.every(erIkkeStormodtager),"Postnumre indeholder stormodtagerpostnumre")
      done();
    })
  })

  it("q=Eske*", function(done){
    request(encodeURI(host+"/postnumre?q=eske*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Eske')!=-1,"Navn indeholder ikke ekse")
      done();
    })
  })

  it("cirkel=12.5816211914473,55.6812196135705,10", function(done){
    request(encodeURI(host+"/postnumre?cirkel=12.5816211914473,55.6812196135705,10&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var postnumre= JSON.parse(body);
      assert(postnumre.length==2,"Skulle rumme 2 postnumre")
      done();
    })
  })

  it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'postnumre/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '34';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var postnumre= JSON.parse(body);
      assert(postnumre.length > 0, 'Der burde være postnumre, som starter med 34')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })


  it("Kommunetilknytning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='postnumre/5601';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var postnummer= JSON.parse(response.body);
      assert(postnummer.kommuner.length>=1, "Der er burde være mindst 1: "+postnummer.kommuner.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("bbox", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='postnumre/3450';
    options.qs= {};
    options.qs.format= 'geojson';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var postnummer= JSON.parse(response.body);
      assert(postnummer.bbox.length===4, "bbox.length!=4");
      let xmin= postnummer.bbox[0];
      let ymin= postnummer.bbox[1];
      let xmax= postnummer.bbox[2];
      let ymax= postnummer.bbox[3];
      let coors= postnummer.geometry.coordinates[0][0];
      assert(coors.length>1, "Der er burde være mindst 1: "+coors.length);
      for (let i= 0; i < coors.length; i++) {        
        assert(coors[i][0]>xmin, "bbox xmin(" + xmin + " er >= end koordinat("+coors[i][0] + ")");
        assert(coors[i][1]>ymin, "bbox ymin(" + ymin + " er >= end koordinat("+coors[i][1] + ")");
        assert(coors[i][0]<xmax, "bbox xmax(" + xmax + " er <= end koordinat("+coors[i][2] + ")");
        assert(coors[i][1]<ymax, "bbox ymax(" + xmax + " er <= end koordinat("+coors[i][3] + ")");
      }
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'postnumre/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'all';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var postnumre= JSON.parse(body);
      assert(postnumre.length > 0, 'Der burde være postnumre, som starter med all')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })


  it("Landpostnumre", function(done){
    const minøst = (accumulator, currentValue) => {/*console.log('value: ' + currentValue[0]); */ if (accumulator>currentValue[0]) accumulator= currentValue[0]; return accumulator}; 

    var optpostnumre= {};
    optpostnumre.baseUrl= host;
    optpostnumre.url='/postnumre';
    optpostnumre.qs= {};
    optpostnumre.qs.nr= '6720'; 
    optpostnumre.qs.format= 'geojson'; 
    optpostnumre.qs.cache= 'no-cache';
    optpostnumre.resolveWithFullResponse= true;
    optpostnumre.simple= false;
    var postnumrerequest= rp(optpostnumre);

    var optlandpostnumre= {};
    optlandpostnumre.baseUrl= host;
    optlandpostnumre.url='/postnumre';
    optlandpostnumre.qs= {};
    optlandpostnumre.qs.nr= '6720';
    optlandpostnumre.qs.landpostnumre= true;
    optlandpostnumre.qs.format= 'geojson'; 
    optlandpostnumre.qs.cache= 'no-cache';
    optlandpostnumre.resolveWithFullResponse= true;
    optlandpostnumre.simple= false;
    var landpostnumrerequest= rp(optlandpostnumre);

    Promise.all([postnumrerequest, landpostnumrerequest]).then(function (responses) {
      assert.equal(responses[0].statusCode,200);
      assert.equal(responses[1].statusCode,200);
      var postnumre= JSON.parse(responses[0].body);
      var landpostnumre= JSON.parse(responses[1].body);
      var postnumreminøst= postnumre.features[0].geometry.coordinates[0][0].reduce(minøst, 15.0);
      var landpostnumreminøst= landpostnumre.features[0].geometry.coordinates[0][0].reduce(minøst, 15.0);
      //console.log('postnumreminøst: %d, landpostnumreminøst: %d',postnumreminøst,landpostnumreminøst);
      assert(postnumreminøst<landpostnumreminøst, 'landpostnumre ligger i havet');
      done();
    }).catch(reason => { 
      done(reason);
    });

  });


});

describe('Kommunesøgning', function(){

  it("q=alle*", function(done){
    request(encodeURI(host+"/kommuner?q=alle*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Alle')!=-1,"Navn indeholder ikke Alle")
      done();
    })
  })

  it("Christiansø", function(done){
    request(encodeURI(host+"/kommuner?navn=Christiansø&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var kommuner= JSON.parse(body);
      assert(kommuner.length === 1, 'Christiansø er ikke fundet');
      var navn= kommuner[0].navn;
      let udenforkommuneinddeling= kommuner[0].udenforkommuneinddeling;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);

      assert(udenforkommuneinddeling,"Christiansø er ikke udenfor kommuneinddeling")
      assert(navn === 'Christiansø',"Navn er ikke Christiansø")
      done();
    })
  })

  it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'kommuner/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '1';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var kommuner= JSON.parse(body);
      assert(kommuner.length > 0, 'Der burde være kommuner, som starter med 1')
      // kommuner.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'kommuner/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'kø';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var kommuner= JSON.parse(body);
      assert(kommuner.length > 0, 'Der burde være kommuner, som starter med kø')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Regionssøgning', function(){

  it("q=syd*", function(done){
    request(encodeURI(host+"/regioner?q=syd*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Syd')!=-1,"Navn indeholder ikke Syd")
      done();
    })
  })


it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'regioner/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '10';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var regioner= JSON.parse(body);
      assert(regioner.length > 0, 'Der burde være regioner, som starter med 10')
      // regioner.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'regioner/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var regioner= JSON.parse(body);
      assert(regioner.length > 0, 'Der burde være regioner, som starter med ho')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});


describe('Landsdele', function(){

  it("q=syd*", function(done){
    request(encodeURI(host+"/landsdele?q=syd*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var landsdele= JSON.parse(body);
      var navn= landsdele[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(navn.search('Syd')!=-1,"Navn indeholder ikke Syd")
      done();
    })
  })


it("autocomplete nuts3", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'landsdele';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'DK011';
    options.qs.autocomplete= true;
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var landsdele= JSON.parse(body);
      assert(landsdele.length > 0, 'Der burde være landsdele, som starter med DK011')
      // regioner.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'landsdele';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'byen';
    options.qs.autocomplete= true;
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var landsdele= JSON.parse(body);
      assert(landsdele.length > 0, 'Der burde være landsdele, som starter med byen');
      request(landsdele[0].href+'?cache=no-cache', (error, response, body) => { 
        console.log(landsdele[0].href); 
        assert.equal(error,null, 'href adresserer ikke en landsdel');
        assert.equal(response.statusCode,200, 'href adresserer ikke en landsdel');
        var landsdel= JSON.parse(body);
        request(landsdel.href+'?cache=no-cache', (error, response, body) => { 
          console.log(landsdel.href); 
          assert.equal(error,null, 'href adresserer ikke en landsdel');
          assert.equal(response.statusCode,200, 'href adresserer ikke en landsdel');
          done();
        })
      })
    })
  })

});

describe('Sognesøgning', function(){

  it("q=grøn*", function(done){
    request(encodeURI(host+"/sogne?q=grøn*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Grøn')!=-1,"Navn indeholder ikke Grøn")
      done();
    })
  })


it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'sogne/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '70';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var sogne= JSON.parse(body);
      assert(sogne.length > 0, 'Der burde være sogne, som starter med 70')
      // sogne.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'sogne/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'gr';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var sogne= JSON.parse(body);
      assert(sogne.length > 0, 'Der burde være sogne, som starter med gr')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  }) 

  it("reverse geokodning med nærmest", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'sogne';
    options.qs= {cache: 'no-cache'};
    options.qs.x= 12.054613430562348;
    options.qs.y= 55.709279836294584;
    options.qs.nærmeste= true;
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var sogn= JSON.parse(body);
      //assert(sogne.length > 0, 'Der burde være sogne, som starter med gr')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Retskredssøgning', function(){

  it("q=hil*", function(done){
    request(encodeURI(host+"/retskredse?q=hil*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Hil')!=-1,"Navn indeholder ikke Hil")
      done();
    })
  })

  it("autocomplete nr", function(done){
      var options= {};
      options.baseUrl= host;
      options.url= 'retskredse/autocomplete';
      options.qs= {cache: 'no-cache'};
      options.qs.q= '1';
      request(options, function (error, response, body) {
        assert.equal(error,null);
        assert.equal(response.statusCode,200);
        var retskredse= JSON.parse(body);
        assert(retskredse.length > 0, 'Der burde være retskredse, som starter med 1')
        // retskredse.forEach(function (adgangsadresse, index) {
        //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
        // });
        //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
        done();
      })
    })

    it("autocomplete navn", function(done){
      var options= {};
      options.baseUrl= host;
      options.url= 'retskredse/autocomplete';
      options.qs= {cache: 'no-cache'};
      options.qs.q= 'ho';
      request(options, function (error, response, body) {
        assert.equal(error,null);
        assert.equal(response.statusCode,200);
        var retskredse= JSON.parse(body);
        assert(retskredse.length > 0, 'Der burde være retskredse, som starter med ho')
        // postnumre.forEach(function (adgangsadresse, index) {
        //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
        // });
        //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
        done();
      })
    })
});

describe('Politikredssøgning', function(){

  it("q=fyn*", function(done){
    request(encodeURI(host+"/politikredse?q=fyn*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Fyn')!=-1,"Navn indeholder ikke Fyn")
      done();
    })
  })


it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'politikredse/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '14';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var politikredse= JSON.parse(body);
      assert(politikredse.length > 0, 'Der burde være politikredse, som starter med 14')
      // politikredse.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'politikredse/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'kø';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var politikredse= JSON.parse(body);
      assert(politikredse.length > 0, 'Der burde være politikredse, som starter med kø')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});


describe('Afstemningsområder', function(){

  it("q=nør*", function(done){
    request(encodeURI(host+"/afstemningsomraader?q=nør*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområder= JSON.parse(body);
      var navn= afstemningsområder[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(navn);
      assert(navn.search('Nør')!=-1,"Navn indeholder ikke Nør")
      done();
    })
  })

it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'afstemningsomraader/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '4';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområder= JSON.parse(body);
      assert(afstemningsområder.length > 0, 'Der burde være afstemningsområder, som starter med 4')
      // opstillingskredse.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'afstemningsomraader/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområder= JSON.parse(body);
      assert(afstemningsområder.length > 0, 'Der burde være afstemningsområder, som starter med ho')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn 2", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'afstemningsomraader';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    options.qs.autocomplete= true;
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområder= JSON.parse(body);
      assert(afstemningsområder.length > 0, 'Der burde være afstemningsområder, som starter med ho')
      request(afstemningsområder[0].href, function (error, response, body) {
        assert.equal(error,null, 'ugyldig href');
        assert.equal(response.statusCode,200, 'ugyldig href');
        done();
      })
    })
  })

  it("reverse geokodning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'afstemningsomraader';
    options.qs= {cache: 'no-cache'};
    options.qs.x= 9.4808535;      
    options.qs.y= 56.37780327;
    //options.qs.nærmeste= true;
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområde= JSON.parse(body);
      //assert(sogne.length > 0, 'Der burde være sogne, som starter med gr')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});


describe('Menighedsrådsafstemningsområder', function(){

  it("q=Tri*", function(done){
    request(encodeURI(host+"/menighedsraadsafstemningsomraader?q=tri*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområder= JSON.parse(body);
      var navn= afstemningsområder[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(navn);
      assert(navn.search('Tri')!=-1,"Navn indeholder ikke Tri")
      done();
    })
  })

it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'menighedsraadsafstemningsomraader/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '4';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområder= JSON.parse(body);
      assert(afstemningsområder.length > 0, 'Der burde være afstemningsområder, som starter med 4')
      // opstillingskredse.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'menighedsraadsafstemningsomraader/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområder= JSON.parse(body);
      assert(afstemningsområder.length > 0, 'Der burde være afstemningsområder, som starter med ho')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn 2", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'menighedsraadsafstemningsomraader';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    options.qs.autocomplete= true;
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområder= JSON.parse(body);
      assert(afstemningsområder.length > 0, 'Der burde være afstemningsområder, som starter med ho')
      request(afstemningsområder[0].href+'?cache=no-cache', function (error, response, body) {
        assert.equal(error,null, 'Ugyldig href');
        assert.equal(response.statusCode,200, 'Ugyldig href');
        done();
      })
    })
  })

  it("reverse geokodning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'menighedsraadsafstemningsomraader';
    options.qs= {cache: 'no-cache'};
    options.qs.x= 9.4808535;      
    options.qs.y= 56.37780327;
    //options.qs.nærmeste= true;
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var afstemningsområde= JSON.parse(body);
      //assert(sogne.length > 0, 'Der burde være sogne, som starter med gr')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Storkredssøgning', function(){

  it('valglandsdele', function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/storkredse';
    options.qs= {};
    options.qs.valglandsdelsbogstav= 'A';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {

      assert(response.statusCode===200, "Http status code != 200");

      var storkredse= JSON.parse(response.body);
      assert(storkredse.length === 4, "Antallet af storkredse i valglandsdel A er ikke 4");
      done();
    })
    .catch((err) => {
      done(err);
    })
  })

  it('regionskode', function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/storkredse';
    options.qs= {};
    options.qs.regionskode= '1085';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {

      assert(response.statusCode===200, "Http status code != 200");

      var storkredse= JSON.parse(response.body);
      assert(storkredse.length === 1, "Antallet af storkredse i Regions Sjælland A er ikke 1");
      done();
    })
    .catch((err) => {
      done(err);
    })
  })

});

describe('Opstillingskredssøgning', function(){

  it("q=nør*", function(done){
    request(encodeURI(host+"/opstillingskredse?q=nør*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Nør')!=-1,"Navn indeholder ikke Nør")
      done();
    })
  })

  it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'opstillingskredse/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '4';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var opstillingskredse= JSON.parse(body);
      assert(opstillingskredse.length > 0, 'Der burde være opstillingskredse, som starter med 4')
      // opstillingskredse.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'opstillingskredse/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var opstillingskredse= JSON.parse(body);
      assert(opstillingskredse.length > 0, 'Der burde være opstillingskredse, som starter med ho')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Adgangsadressesøgning', function(){

  it('rødkild*, 46, 2400', function(done){
    request(encodeURI(host+'/adgangsadresser?q=rødkild*&husnr=46&postnr=2400&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert.equal(adresser.length,1);
	    done();
	  })
	})

	 it('vejnavn=Rødkildevej', function(done){
    request(encodeURI(host+'/adgangsadresser?vejnavn=Rødkildevej&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert(adresser.length>1);
	    done();
	  })
	})

   function husnrmindreogligmed(a,b) {
    var regex= /(\d{1,3})([A-ZÆØÅa-zæøå]{0,1})/;
    var r= regex.exec(a);
    var anr= parseInt(r[1]);
    let abogstav= r.length>2?r[2]:"";
    r= regex.exec(b);
    let bnr= parseInt(r[1]);
    let bbogstav= r.length>2?r[2]:"";
    //console.log('a: nr: %s, bogstav: %s. b: nr: %s, bogstav: %s.',anr, abogstav, bnr, bbogstav);
    return (anr <= bnr) || (anr === bnr & abogstav.localeCompare(bbogstav)<=0);
   }

   function husnrstørreogligmed(a,b) {
    var regex= /(\d{1,3})([A-ZÆØÅa-zæøå]{0,1})/;
    var r= regex.exec(a);
    var anr= parseInt(r[1]);
    let abogstav= r.length>2?r[2]:"";
    r= regex.exec(b);
    let bnr= parseInt(r[1]);
    let bbogstav= r.length>2?r[2]:"";
    //console.log('a: nr: %s, bogstav: %s. b: nr: %s, bogstav: %s.',anr, abogstav, bnr, bbogstav);
    return (anr >= bnr) || (anr === bnr & abogstav.localeCompare(bbogstav)>=0);
   }


  it("husnrfra", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.vejnavn= 'Næsbyholmvej';
    options.qs.postnr= '2700';
    options.qs.husnrfra= '14C';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      adgangsadresser.forEach(function (adgangsadresse, index) {
        assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

   it("husnrtil", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.vejnavn= 'Næsbyholmvej';
    options.qs.postnr= '2700';
    options.qs.husnrtil= '16B';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      adgangsadresser.forEach(function (adgangsadresse, index) {
        assert(husnrmindreogligmed(adgangsadresse.husnr,'16B'));
      });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

   it("husnrfra og husnrtil", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.vejnavn= 'Næsbyholmvej';
    options.qs.postnr= '2700';
    options.qs.husnrfra= '14C';
    options.qs.husnrtil= '16B';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      adgangsadresser.forEach(function (adgangsadresse, index) {
        assert(husnrmindreogligmed(adgangsadresse.husnr,'16B'));
        assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it('sogn', function(done){
    request(encodeURI(host+'/adgangsadresser?sognekode=7060&vejnavn=Rødkildevej&cache=no-cache'), function (error, response, body) {   
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      assert(adgangsadresser.length>0);
      done();
    })
  })


  it("cirkel og adgangspunkt", function(done){

    var optvej= {};
    optvej.baseUrl= host;
    optvej.url='/adgangsadresser';
    optvej.qs= {};
    optvej.qs.cirkel= '11.25186711,55.72926984,5'; // Alleshavevej 48, 4593
    optvej.qs.geometri= 'vejpunkt';
    optvej.qs.cache= 'no-cache';
    optvej.resolveWithFullResponse= true;
    optvej.simple= false;
    var vejrequest= rp(optvej);

    var optadgang= {};
    optadgang.baseUrl= host;
    optadgang.url='/adgangsadresser';
    optadgang.qs= {};
    optadgang.qs.cirkel= '11.25186711,55.72926984,5';
    optadgang.qs.geometri= 'adgangspunkt';
    optadgang.qs.cache= 'no-cache';
    optadgang.resolveWithFullResponse= true;
    optadgang.simple= false;
    var adgangrequest= rp(optadgang);

    Promise.all([vejrequest, adgangrequest]).then(function (responses) {
      assert.equal(responses[0].statusCode,200);
      assert.equal(responses[1].statusCode,200);
      var vej= JSON.parse(responses[0].body);
      var adgang= JSON.parse(responses[1].body);
      //console.log('vej.length: %d, adgang.length: %d',vej.length,adgang.length);
      assert(vej.length===0, 'adgangsadresse fundet ud fra vejpunkt og cirkel')
      assert(adgang.length===1, 'adgangsadresse ikke fundet ud fra adgangspunkt og cirkel')
      assert(adgang[0].husnr==='48', 'reverse på vejpunkt burde være 48'); 
      done();
    }).catch(reason => { 
      done(reason);
    });

  });

  it("cirkel og vejpunkt", function(done){

    var optvej= {};
    optvej.baseUrl= host;
    optvej.url='/adgangsadresser';
    optvej.qs= {};
    optvej.qs.cirkel= '11.24841865,55.72338078,10'; // Alleshavevej 48, 4593
    optvej.qs.geometri= 'vejpunkt';
    optvej.qs.cache= 'no-cache';
    optvej.resolveWithFullResponse= true;
    optvej.simple= false;
    var vejrequest= rp(optvej);

    var optadgang= {};
    optadgang.baseUrl= host;
    optadgang.url='/adgangsadresser';
    optadgang.qs= {};
    optadgang.qs.cirkel= optvej.qs.cirkel;
    optadgang.qs.geometri= 'adgangspunkt';
    optadgang.qs.cache= 'no-cache';
    optadgang.resolveWithFullResponse= true;
    optadgang.simple= false;
    var adgangrequest= rp(optadgang);

    Promise.all([vejrequest, adgangrequest]).then(function (responses) {
      assert.equal(responses[0].statusCode,200);
      assert.equal(responses[1].statusCode,200);
      var vej= JSON.parse(responses[0].body);
      var adgang= JSON.parse(responses[1].body);
      assert(vej.length===1, 'adgangsadresse ikke fundet ud fra vejpunkt og cirkel')
      assert(adgang.length===0, 'adgangsadresse fundet ud fra adgangspunkt og cirkel')
      assert(vej[0].husnr==='48', 'reverse på vejpunkt burde være 48'); 
      done();
    }).catch(reason => { 
      done(reason);
    });

  });

  it("polygon og vejpunkt", function(done){

    var optvej= {};
    optvej.baseUrl= host;
    optvej.url='/adgangsadresser';
    optvej.qs= {};      // Alleshavevej 48, 4593
    optvej.qs.polygon= '[[[11.248430546192973, 55.723716732037296],[11.248881118413367, 55.72313325642938],[11.248022327050677, 55.72326402688884],[11.248430546192973, 55.723716732037296]]]';
    optvej.qs.geometri= 'vejpunkt';
    optvej.qs.cache= 'no-cache';
    optvej.resolveWithFullResponse= true;
    optvej.simple= false;
    var vejrequest= rp(optvej);

    var optadgang= {};
    optadgang.baseUrl= host;
    optadgang.url='/adgangsadresser';
    optadgang.qs= {};
    optadgang.qs.polygon= optvej.qs.polygon;
    optadgang.qs.geometri= 'adgangspunkt';
    optadgang.qs.cache= 'no-cache';
    optadgang.resolveWithFullResponse= true;
    optadgang.simple= false;
    var adgangrequest= rp(optadgang);

    Promise.all([vejrequest, adgangrequest]).then(function (responses) {
      assert.equal(responses[0].statusCode,200);
      assert.equal(responses[1].statusCode,200);
      var vej= JSON.parse(responses[0].body);
      var adgang= JSON.parse(responses[1].body);
      assert(vej.length===1, 'adgangsadresse ikke fundet ud fra vejpunkt og cirkel')
      assert(adgang.length===0, 'adgangsadresse fundet ud fra adgangspunkt og cirkel')
      assert(vej[0].husnr==='48', 'reverse på vejpunkt burde være 48'); 
      done();
    }).catch(reason => { 
      done(reason);
    });

  });


  it("polygon og adgangspunkt", function(done){

    var optvej= {};
    optvej.baseUrl= host;
    optvej.url='/adgangsadresser';
    optvej.qs= {}; // Alleshavevej 48, 4593
    optvej.qs.polygon= '[[[11.251517395720864, 55.729757549168234],[11.253021444039282, 55.728881507651074],[11.250538933028965, 55.728696939800585],[11.251517395720864, 55.729757549168234]]]';
    optvej.qs.geometri= 'vejpunkt';
    optvej.qs.cache= 'no-cache';
    optvej.resolveWithFullResponse= true;
    optvej.simple= false;
    var vejrequest= rp(optvej);

    var optadgang= {};
    optadgang.baseUrl= host;
    optadgang.url='/adgangsadresser';
    optadgang.qs= {};
    optadgang.qs.polygon= optvej.qs.polygon;
    optadgang.qs.geometri= 'adgangspunkt';
    optadgang.qs.cache= 'no-cache';
    optadgang.resolveWithFullResponse= true;
    optadgang.simple= false;
    var adgangrequest= rp(optadgang);

    Promise.all([vejrequest, adgangrequest]).then(function (responses) {
      assert.equal(responses[0].statusCode,200);
      assert.equal(responses[1].statusCode,200);
      var vej= JSON.parse(responses[0].body);
      var adgang= JSON.parse(responses[1].body);
      assert(vej.length===0, 'adgangsadresse ikke fundet ud fra vejpunkt og cirkel')
      assert(adgang.length===1, 'adgangsadresse fundet ud fra adgangspunkt og cirkel')
      assert(adgang[0].husnr==='48', 'reverse på vejpunkt burde være 48'); 
      done();
    }).catch(reason => { 
      done(reason);
    });
  });

  it('esrejendomsnr', function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/adgangsadresser/22729a66-96b1-44d0-e044-0003ba298018';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {

      assert(response.statusCode===200, "Http status code != 200");

      var aadresse= JSON.parse(response.body);

      var esroptions= {};
      esroptions.baseUrl= host;
      esroptions.url='/adgangsadresser';
      esroptions.qs= {};
      esroptions.qs.esrejendomsnr= aadresse.jordstykke.esrejendomsnr;
      esroptions.qs.cache= 'no-cache';
      esroptions.resolveWithFullResponse= true;
      rp(esroptions).then((response) => {
        assert(response.statusCode===200, "Http status code != 200");
        var aadresser= JSON.parse(response.body);
        let found= aadresser.find(function (element) {return aadresse.id === element.id;});
        assert(found, "esrejendomsnr søgning fungerer ikke");
        done();
      })

    })
    .catch((err) => {
      done(err);
    });
  })

  it('adgangspunktid', function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/adgangsadresser';
    options.qs= {};
    options.qs.adgangspunktid= '0a3f507a-ea2d-32b8-e044-0003ba298018';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {

      assert(response.statusCode===200, "Http status code != 200");

      var aadresser= JSON.parse(response.body);
      assert(aadresser[0].id === '0a3f507a-ea2d-32b8-e044-0003ba298018', "Forkert adgansadresse");
      done();
    })
    .catch((err) => {
      done(err);
    });
  })

  it('vejpunkt_id', function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/adgangsadresser';
    options.qs= {};
    options.qs.vejpunkt_id= '11f21a59-af45-11e7-847e-066cff24d637';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {

      assert(response.statusCode===200, "Http status code != 200");

      var aadresser= JSON.parse(response.body);
      assert(aadresser[0].id === '0a3f507a-ea2d-32b8-e044-0003ba298018', "Forkert adgansadresse");
      done();
    })
    .catch((err) => {
      done(err);
    });
  })
});


describe('Adgangsadresseopslag', function(){

  it('reverse geokodning', function(done){
    request(encodeURI(host+'/adgangsadresser/reverse?x=12.5851471984198&y=55.6832383751223&cache=no-cache'), function (error, response, body) {   
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresse= JSON.parse(body);
      assert.equal(adgangsadresse.vejstykke.navn,"Landgreven");
      done();
    })
  })

  https://dawa-p2.aws.dk/adgangsadresser/reverse?x=11.254677072750962&y=55.72665088543518&format=geojson&geometri=vejpunkt

  it("reverse og vejpunkt", function(done){

    var optvej= {};
    optvej.baseUrl= host;
    optvej.url='/adgangsadresser/reverse';
    optvej.qs= {};
    optvej.qs.x= 11.24841865; // Alleshavevej 48, 4593
    optvej.qs.y= 55.72338078;
    optvej.qs.geometri= 'vejpunkt';
    optvej.qs.cache= 'no-cache';
    optvej.resolveWithFullResponse= true;
    optvej.simple= false;
    var vejrequest= rp(optvej);

    var optadgang= {};
    optadgang.baseUrl= host;
    optadgang.url='/adgangsadresser/reverse';
    optadgang.qs= {};
    optadgang.qs.x= 11.254677072750962;
    optadgang.qs.y= 55.72665088543518;
    optadgang.qs.geometri= 'adgangspunkt';
    optadgang.qs.cache= 'no-cache';
    optadgang.qs.id= '0a3f509d-66fe-32b8-e044-0003ba298018';
    optadgang.resolveWithFullResponse= true;
    optadgang.simple= false;
    var adgangrequest= rp(optadgang);

    Promise.all([vejrequest, adgangrequest]).then(function (responses) {
      assert.equal(responses[0].statusCode,200);
      assert.equal(responses[1].statusCode,200);
      var vej= JSON.parse(responses[0].body);
      var adgang= JSON.parse(responses[1].body);
      assert(vej.husnr==='48', 'reverse på vejpunkt burde være 48'); 
      assert(adgang.husnr==='46', 'reverse på adgangspunkt burde være 46'); 
      done();
    }).catch(reason => { 
      done(reason);
    });

  });

});

describe('Adgangsadresseautocomplete', function(){

  it("Indeholder adgangsadresse", function(done){
    request(encodeURI(host+"/adgangsadresser/autocomplete?q=Lilledal 1&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      //console.log(body);
      var adadresser= JSON.parse(body);
      var adadresse= adadresser[0];
      //console.log(util.inspect(adadresse));  
      assert("adgangsadresse" in adadresse,"Property adgangsadresse mangler");
      done();
    })
  })

  it("Kan håndtere ë", function(done){
    request(encodeURI(host+"/adgangsadresser/autocomplete?q=Tove Maës Vej&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adadresser= JSON.parse(body);
      var adadresse= adadresser[0]; assert.equal(error,null);
      assert(adadresser.length>1,"Der er flere adgangsadresser på Tove Maës vej end en");      
      assert('adgangsadresse' in adadresse,"Property adgangsadresse mangler");
      done();
    })
  })

  it('reverse geokodning', function(done){
    request(encodeURI(host+'/adgangsadresser/reverse?y=55.737308&x=12.513428&cache=no-cache'), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresse= JSON.parse(body);
      let line= util.format(adresse.vejstykke.navn + " " + adresse.husnr + ', ' + adresse.postnummer.nr + ' ' + adresse.postnummer.navn + '(' + adresse.kommune.kode + ')');
      //console.log(line);
      done();
    })
  });
  
});

describe('Ejerlav', function(){

  // it("autocomplete nr", function(done){
  //   var options= {};
  //   options.baseUrl= host;
  //   options.url= 'opstillingskredse/autocomplete';
  //   options.qs= {cache: 'no-cache'};
  //   options.qs.q= '4';
  //   request(options, function (error, response, body) {
  //     assert.equal(error,null);
  //     assert.equal(response.statusCode,200);
  //     var opstillingskredse= JSON.parse(body);
  //     assert(opstillingskredse.length > 0, 'Der burde være opstillingskredse, som starter med 4')
  //     // opstillingskredse.forEach(function (adgangsadresse, index) {
  //     //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
  //     // });
  //     //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
  //     done();
  //   })
  // })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'ejerlav/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var ejerlav= JSON.parse(body);
      assert(ejerlav.length > 0, 'Der burde være ejerlav, som starter med ho')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Jordstykker', function(){

  it("I ejerlav", function(done){
    request(encodeURI(host+"/jordstykker?ejerlavkode=80652&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var jordstykker= JSON.parse(body);
      assert(jordstykker.length>50,"Jordstykker mangler i ejelav");
      done();
    })
  })

  it("opslag", function(done){
    request(encodeURI(host+"/jordstykker/100453/8bd?cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var jordstykke= JSON.parse(body);    
      assert(jordstykke.ejerlav.kode===100453,"Forkert jordstykke");
      done();
    })
  })

  it("opslag - geojson", function(done){
    request(encodeURI(host+"/jordstykker/100453/8bd?format=geojson&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var jordstykke= JSON.parse(body);    
      assert(jordstykke.properties.ejerlavkode===100453,"Forkert jordstykke");
      done();
    })
  })
  https://dawa-p2.aws.dk/jordstykker?ejerlavkode=100453&matrikelnr=8bd&&format=geojson

  it('reverse geokodning', function(done){
    request(encodeURI(host+'/jordstykker/reverse?y=55.737308&x=12.513428&cache=no-cache'), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var jordstykke= JSON.parse(body); 
      //console.log('jordstykke: %s %s (10251 22a)', jordstykke.ejerlav.kode, jordstykke.matrikelnr);     
      assert(jordstykke.ejerlav.kode===10251&&jordstykke.matrikelnr==="22ia","Forkert jordstykke");
      done();
    })
  });
  
});


describe('Historik', function(){
  
  it("Historik på nedlagte adresser", function(done){

    var optadr= {};
    optadr.baseUrl= host;
    optadr.url='/adresser/0a3f509d-66fe-32b8-e044-0003ba298018';
    optadr.qs= {};
    optadr.qs.cache= 'no-cache';
    optadr.resolveWithFullResponse= true;
    optadr.simple= false;
    var adrrequest= rp(optadr);

    var opthist= {};
    opthist.baseUrl= host;
    opthist.url= '/historik/adresser';
    opthist.qs= {};
    opthist.qs.cache= optadr.qs.cache;
    opthist.qs.id= '0a3f509d-66fe-32b8-e044-0003ba298018';
    opthist.resolveWithFullResponse= true;
    opthist.simple= false;
    var histrequest= rp(opthist);

    Promise.all([adrrequest, histrequest]).then(function (responses) {
      assert.equal(responses[0].statusCode,404);
      assert.equal(responses[1].statusCode,200);
      var adresse= JSON.parse(responses[0].body);
      var historik= JSON.parse(responses[1].body);
      assert(historik.length>0,'Ingen historikposter');
      function nedlagt(element, index, array) {
        return element.status === 2 || element.status === 4;
      }
      assert(historik.some(nedlagt), 'Ingen nedlagte eller henlagte'); 
      done();
    }).catch(reason => { 
      done(reason);
    });

  })
});

describe('Adressevask', function(){

  it("rentemestervej 4, 2400 københavn NV", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rentemestervej 4, 2400 københavn NV';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("rentemester vej 4, 2400 københavn NV", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rentemester vej 4, 2400 københavn NV';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("rente mester vej 4, 2400 københavn NV", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rente mester vej 4, 2400 københavn NV';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("rante mester vej 4, 2400 københavn NV", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rante mester vej 4, 2400 københavn NV';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("rante mester vej 4, 2400", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rante mester vej 4, 2400';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("Rådhusstrædet 4, 3650 Ølstykke", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.betegnelse= 'Rådhusstrædet 4, 3650 Ølstykke';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var resultat= JSON.parse(response.body);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori A');
      assert(resultat.resultater[0].aktueladresse.adresseringsvejnavn==='Rådhusstrædet', 'Det fundne vejnavn er ikke Rådhusstrædet');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Neder-Holluf-Vej 3, Neder Holluf, 5220 Odense SØ", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'Neder-Holluf-Vej 3, Neder Holluf, 5220 Odense SØ';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori A, men ' + resultat.kategori);
      done();
    })
  })

  it("Neder-Holluf-Vej 3, 5220 Odense SØ", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'Neder-Holluf-Vej 3, 5220 Odense SØ';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori A, men ' + resultat.kategori);
      done();
    })
  })
  
  it("rådhus pladsen 75, 1550", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rådhus pladsen 75, 1550';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B, men ' + resultat.kategori);
      assert(resultat.resultater[0].aktueladresse.vejnavn==='Regnbuepladsen', 'Burde være Regnbuepladsen, men er ' + resultat.resultater[0].aktueladresse.vejnavn);
      assert(resultat.resultater[0].aktueladresse.husnr==='5', 'Burde være 5, men er ' + resultat.resultater[0].aktueladresse.husnr);
      done();
    })
  })

  it("rådhus pladsen 1, 1599 - stormodtagerpostnummer", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rådhus pladsen 1, 1599';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B, men ' + resultat.kategori);
      assert(resultat.resultater[0].aktueladresse.postnr==='1550', 'Burde være 1550, men er ' + resultat.resultater[0].aktueladresse.vejnavn);
      done();
    })
  })

  it("hf arb bol kolonih 1, 2500 - adresseringsnavn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'hf arb bol kolonih 1, 2500';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B, men ' + resultat.kategori);
      assert(resultat.resultater[0].aktueladresse.vejnavn==='Høffdingsvej', 'Burde være Høffdingsvej, men er ' + resultat.resultater[0].aktueladresse.vejnavn);
      done();
    })
  })

  it("Ravsted Skolegade 5, 6372 Bylderup-Bov", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.betegnelse= 'Ravsted Skolegade 5, 6372 Bylderup-Bov';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var resultat= JSON.parse(response.body);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori A');
      assert(resultat.resultater[0].aktueladresse.adresseringsvejnavn==='Ravsted Skolegade', 'Det fundne vejnavn er ikke Rådhusstrædet');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });
  
}); 

describe('Zone', function(){

  it("Rosenlundsvej 3, 2791 Dragør", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'Rosenlundsvej 3, 2791 Dragør';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      var adgangsadresse= adgangsadresser[0];
      //console.log(adgangsadresse);
      assert(adgangsadresse.zone==='Sommerhusområde', 'Zone er ikke Sommerhusområde, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("Kalvebodvej 3, 2791 Dragør", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'Kalvebodvej 30, 2791 Dragør';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      var adgangsadresse= adgangsadresser[0];
      //console.log(adgangsadresse);
      assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("q=Kalvebodvej 1, 2791 Dragør&zone=Landzone", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'Kalvebodvej 30, 2791 Dragør';
    options.qs.zone='Landzone';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      assert(adgangsadresser.length===1, 'Adressen burde ligge i landzonen')
      var adgangsadresse= adgangsadresser[0];
      //console.log(adgangsadresse);
      assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("Ahornvej 16, 2791 Dragør", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'Ahornvej 16, 2791 Dragør';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      var adgangsadresse= adgangsadresser[0];
      //console.log(adgangsadresse);
      assert(adgangsadresse.zone==='Byzone', 'Zone er ikke Byzone, men ' + adgangsadresse.zone);
      done();
    })
  })


  it("Samme zone i json og csv format", function(done){

    var optjson= {};
    optjson.baseUrl= host;
    optjson.url='adgangsadresser';
    optjson.qs= {};
    optjson.qs.cache= 'no-cache';
    optjson.qs.vejnavn= 'Kalvebodvej';
    optjson.qs.husnr= '166';
    optjson.qs.postnr= '2791';
    var jsonrequest= rp(optjson);

    var optcsv= {};
    optcsv.baseUrl= host;
    optcsv.url=optjson.url;
    optcsv.qs= {};
    optcsv.qs.cache= optjson.qs.cache;
    optcsv.qs.vejnavn= optjson.qs.vejnavn;
    optcsv.qs.husnr= optjson.qs.husnr;
    optcsv.qs.postnr= optjson.qs.postnr;
    optcsv.qs.format= 'csv';
    var csvrequest= rp(optcsv);

    Promise.all([jsonrequest, csvrequest]).then(function (bodies) {
      var adgangsadresserjson= JSON.parse(bodies[0]);
      var adgangsadressejson= adgangsadresserjson[0];
      //console.log(adgangsadresse);      
      csv.parse(bodies[1], {columns: true}, function (err, adgangsadressercsv) {
        var adgangsadressecsv= adgangsadressercsv[0];
        //console.log(adgangsadressecsv);
        assert(adgangsadressejson.zone===adgangsadressecsv.zone, 'Zone i json og csv format forskellig. json: ' + adgangsadressejson.zone + ', csv: ' + adgangsadressecsv.zone);
        assert(adgangsadressejson.id===adgangsadressecsv.id, 'Id i json og csv format forskellig. json: ' + adgangsadressejson.id + ', csv: ' + adgangsadressecsv.id);
        assert(adgangsadressejson.status==adgangsadressecsv.status, 'Status i json og csv format forskellig. json: |' + adgangsadressejson.status + '|, csv: |' + adgangsadressecsv.status + '|');
        assert(adgangsadressejson.kvh===adgangsadressecsv.kvh, 'kvh i json og csv format forskellig. json: ' + adgangsadressejson.kvh + ', csv: ' + adgangsadressecsv.kvh);
        assert(adgangsadressejson.historik.oprettet===adgangsadressecsv.oprettet, 'oprettet i json og csv format forskellig. json: |' + adgangsadressejson.historik.oprettet + '|, csv: |' + adgangsadressecsv.oprettet + '|');
        assert(adgangsadressejson.historik.ændret===adgangsadressecsv.ændret, 'ændret i json og csv format forskellig. json: ' + adgangsadressejson.historik.ændret + ', csv: ' + adgangsadressecsv.ændret);
        //assert(adgangsadressejson.etage===adgangsadressecsv.etage, 'etage i json og csv format forskellig. json: ' + adgangsadressejson.etage + ', csv: ' + adgangsadressecsv.etage);
        //assert(adgangsadressejson.dør===adgangsadressecsv.dør, 'dør i json og csv format forskellig. json: ' + adgangsadressejson.dør + ', csv: ' + adgangsadressecsv.dør);
         assert(adgangsadressejson.vejstykke.navn===adgangsadressecsv.vejnavn, 'adgangsadresse.vejstykke.navn i json og csv format forskellig. json: ' + adgangsadressejson.vejstykke.navn + ', csv: ' + adgangsadressecsv.vejnavn);
        assert(adgangsadressejson.vejstykke.kode===adgangsadressecsv.vejkode, 'adgangsadresse.vejstykke.kode i json og csv format forskellig. json: ' + adgangsadressejson.vejstykke.kode + ', csv: ' + adgangsadressecsv.vejkode);
        assert(adgangsadressejson.vejstykke.adresseringsnavn===adgangsadressecsv.adresseringsvejnavn, 'adgangsadresse.vejstykke.adresseringsnavn i json og csv format forskellig. json: ' + adgangsadressejson.vejstykke.adresseringsnavn + ', csv: ' + adgangsadressecsv.adresseringsvejnavn);
        assert(adgangsadressejson.husnr===adgangsadressecsv.husnr, 'adgangsadresse.husnr i json og csv format forskellig. json: ' + adgangsadressejson.husnr + ', csv: ' + adgangsadressecsv.husnr);
        assert(adgangsadressejson.supplerendebynavn==adgangsadressecsv.supplerendebynavn||adgangsadressejson.supplerendebynavn===null&&adgangsadressecsv.supplerendebynavn=="", 'adgangsadresse.supplerendebynavn i json og csv format forskellig. json: ' + adgangsadressejson.supplerendebynavn + ', csv: ' + adgangsadressecsv.supplerendebynavn);
        assert(adgangsadressejson.postnummer.nr===adgangsadressecsv.postnr, 'adgangsadresse.postnummer.nr i json og csv format forskellig. json: ' + adgangsadressejson.postnummer.nr + ', csv: ' + adgangsadressecsv.postnr);
        assert(adgangsadressejson.postnummer.navn===adgangsadressecsv.postnrnavn, 'adgangsadresse.postnummer.navn i json og csv format forskellig. json: ' + adgangsadressejson.postnummer.navn + ', csv: ' + adgangsadressecsv.postnrnavn);
        if (adgangsadressejson.stormodtagerpostnr) {
          assert(adgangsadressejson.stormodtagerpostnummer.nr===adgangsadressecsv.stormodtagerpostnr, 'adgangsadresse.stormodtagerpostnummer.nr i json og csv format forskellig. json: ' + adgangsadressejson.stormodtagerpostnummer.nr + ', csv: ' + adgangsadressecsv.stormodtagerpostnr);
          assert(adgangsadressejson.stormodtagerpostnummer.navn===adgangsadressecsv.stormodtagerpostnrnavn, 'adgangsadresse.stormodtagerpostnummer.navn i json og csv format forskellig. json: ' + adgangsadressejson.stormodtagerpostnummer.navn + ', csv: ' + adgangsadressecsv.stormodtagerpostnrnavn);
      
        }
        assert(adgangsadressejson.kommune.kode===adgangsadressecsv.kommunekode, 'adgangsadresse.kommune.nr i json og csv format forskellig. json: ' + adgangsadressejson.kommune.kode + ', csv: ' + adgangsadressecsv.kommunekode);
        assert(adgangsadressejson.kommune.navn===adgangsadressecsv.kommunenavn, 'adgangsadresse.kommune.navn i json og csv format forskellig. json: ' + adgangsadressejson.kommune.navn + ', csv: ' + adgangsadressecsv.kommunenavn);
        assert(adgangsadressejson.ejerlav.kode==adgangsadressecsv.ejerlavkode, 'adgangsadresse.ejerlav.nr i json og csv format forskellig. json: ' + adgangsadressejson.ejerlav.kode + ', csv: ' + adgangsadressecsv.ejerlavkode);
        assert(adgangsadressejson.ejerlav.navn===adgangsadressecsv.ejerlavnavn, 'adgangsadresse.ejerlav.navn i json og csv format forskellig. json: ' + adgangsadressejson.ejerlav.navn + ', csv: ' + adgangsadressecsv.ejerlavnavn);
        assert(adgangsadressejson.sogn.kode===adgangsadressecsv.sognekode, 'adgangsadresse.sogn.nr i json og csv format forskellig. json: ' + adgangsadressejson.sogn.kode + ', csv: ' + adgangsadressecsv.sognekode);
        assert(adgangsadressejson.sogn.navn===adgangsadressecsv.sognenavn, 'adgangsadresse.sogn.navn i json og csv format forskellig. json: ' + adgangsadressejson.sogn.navn + ', csv: ' + adgangsadressecsv.sognenavn);
        assert(adgangsadressejson.region.kode===adgangsadressecsv.regionskode, 'adgangsadresse.region.nr i json og csv format forskellig. json: ' + adgangsadressejson.region.kode + ', csv: ' + adgangsadressecsv.regionskode);
        assert(adgangsadressejson.region.navn===adgangsadressecsv.regionsnavn, 'adgangsadresse.region.navn i json og csv format forskellig. json: ' + adgangsadressejson.region.navn + ', csv: ' + adgangsadressecsv.regionsnavn);
        assert(adgangsadressejson.retskreds.kode===adgangsadressecsv.retskredskode, 'adgangsadresse.retskreds.nr i json og csv format forskellig. json: ' + adgangsadressejson.retskreds.kode + ', csv: ' + adgangsadressecsv.retskredskode);
        assert(adgangsadressejson.retskreds.navn===adgangsadressecsv.retskredsnavn, 'adgangsadresse.retskreds.navn i json og csv format forskellig. json: ' + adgangsadressejson.retskreds.navn + ', csv: ' + adgangsadressecsv.retskredsnavn);
        assert(adgangsadressejson.politikreds.kode===adgangsadressecsv.politikredskode, 'adgangsadresse.politikreds.nr i json og csv format forskellig. json: ' + adgangsadressejson.politikreds.kode + ', csv: ' + adgangsadressecsv.politikredskode);
        assert(adgangsadressejson.politikreds.navn===adgangsadressecsv.politikredsnavn, 'adgangsadresse.politikreds.navn i json og csv format forskellig. json: ' + adgangsadressejson.politikreds.navn + ', csv: ' + adgangsadressecsv.politikredsnavn);
        assert(adgangsadressejson.opstillingskreds.kode===adgangsadressecsv.opstillingskredskode, 'adgangsadresse.opstillingskreds.nr i json og csv format forskellig. json: ' + adgangsadressejson.opstillingskreds.kode + ', csv: ' + adgangsadressecsv.opstillingskredskode);
        assert(adgangsadressejson.opstillingskreds.navn===adgangsadressecsv.opstillingskredsnavn, 'adgangsadresse.opstillingskreds.navn i json og csv format forskellig. json: ' + adgangsadressejson.opstillingskreds.navn + ', csv: ' + adgangsadressecsv.retskredsnavn);
        assert(adgangsadressejson.opstillingskreds.kode===adgangsadressecsv.opstillingskredskode, 'adgangsadresse.opstillingskreds.nr i json og csv format forskellig. json: ' + adgangsadressejson.opstillingskreds.kode + ', csv: ' + adgangsadressecsv.opstillingskredskode);
        assert(adgangsadressejson.opstillingskreds.navn===adgangsadressecsv.opstillingskredsnavn, 'adgangsadresse.opstillingskreds.navn i json og csv format forskellig. json: ' + adgangsadressejson.opstillingskreds.navn + ', csv: ' + adgangsadressecsv.retskredsnavn);
        assert(adgangsadressejson.esrejendomsnr===adgangsadressecsv.esrejendomsnr, 'adgangsadresse.esrejendomsnr i json og csv format forskellig. json: ' + adgangsadressejson.esrejendomsnr + ', csv: ' + adgangsadressecsv.esrejendomsnr);
        assert(adgangsadressejson.matrikelnr===adgangsadressecsv.matrikelnr, 'adgangsadresse.matrikelnr i json og csv format forskellig. json: ' + adgangsadressejson.matrikelnr + ', csv: ' + adgangsadressecsv.matrikelnr);
        
        assert(adgangsadressejson.adgangspunkt.koordinater[0]==adgangsadressecsv.wgs84koordinat_længde, 'adgangspunkt.koordinater[0] i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.koordinater[0] + ', csv: ' + adgangsadressecsv.wgs84koordinat_længde);
        assert(adgangsadressejson.adgangspunkt.koordinater[1]==adgangsadressecsv.wgs84koordinat_bredde, 'adgangspunkt.koordinater[1] i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.koordinater[1] + ', csv: ' + adgangsadressecsv.wgs84koordinat_bredde);
        assert(adgangsadressejson.adgangspunkt.nøjagtighed===adgangsadressecsv.nøjagtighed, 'adgangspunkt.nøjagtighed i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.nøjagtighed + ', csv: ' + adgangsadressecsv.nøjagtighed);
        assert(adgangsadressejson.adgangspunkt.kilde==adgangsadressecsv.kilde, 'adgangspunkt.kilde i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.kilde + ', csv: ' + adgangsadressecsv.kilde);
        assert(adgangsadressejson.adgangspunkt.tekniskstandard===adgangsadressecsv.tekniskstandard, 'adgangspunkt.tekniskstandard i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.tekniskstandard + ', csv: ' + adgangsadressecsv.tekniskstandard);
        assert(adgangsadressejson.adgangspunkt.tekstretning==adgangsadressecsv.tekstretning, 'adgangspunkt.tekstretning i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.tekstretning + ', csv: ' + adgangsadressecsv.tekstretning);
        assert(adgangsadressejson.adgangspunkt.ændret===adgangsadressecsv.adressepunktændringsdato, 'adgangspunkt.adressepunktændringsdato i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.ændret + ', csv: ' + adgangsadressecsv.adressepunktændringsdato);
        assert(adgangsadressejson.jordstykke.ejerlav.kode==adgangsadressecsv.jordstykke_ejerlavkode, 'jordstykke.ejerlav.kode i json og csv format forskellig. json: ' + adgangsadressejson.jordstykke.ejerlav.kode + ', csv: ' + adgangsadressecsv.jordstykke_ejerlavkode);
        assert(adgangsadressejson.jordstykke.matrikelnr===adgangsadressecsv.jordstykke_matrikelnr, 'jordstykke.matrikelnr i json og csv format forskellig. json: ' + adgangsadressejson.jordstykke.matrikelnr + ', csv: ' + adgangsadressecsv.jordstykke_matrikelnr);
        assert(adgangsadressejson.jordstykke.esrejendomsnr===adgangsadressecsv.jordstykke_esrejendomsnr, 'jordstykke.esrejendomsnr i json og csv format forskellig. json: ' + adgangsadressejson.jordstykke.esrejendomsnr + ', csv: ' + adgangsadressecsv.jordstykke_esrejendomsnr);
        done();
      });
    });

  })
})


describe('Bebyggelser', function(){

  function findNavn(navn) {
    return function findBebyggelse(bebyggelse) { 
      return bebyggelse.navn === navn;
    }
  }

  it("Reverse geokodning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='bebyggelser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.x= 12.5108572474172;
    options.qs.y= 55.6983973831476;
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bebyggelser= JSON.parse(response.body);
      assert(bebyggelser.length === 2, "Antal bebyggelsestyper != 2");
      assert(bebyggelser.find(findNavn('Grøndal')), 'Mangler bydel Grøndal');
      assert(bebyggelser.find(findNavn('København')), 'Mangler by København');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Frederiksberg", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='bebyggelser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.x= 12.532079381664;
    options.qs.y= 55.6784255961403;
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bebyggelser= JSON.parse(response.body);
      assert(bebyggelser.find(findNavn('Frederiksberg')), 'Mangler by Frederiksberg');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Navne søgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='bebyggelser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.navn= 'Frederiksberg';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bebyggelser= JSON.parse(response.body);
      assert(bebyggelser.length > 10, "Antal bebyggelser <= 10 (" + bebyggelser.length + ")");
      assert(bebyggelser.find(findNavn('Frederiksberg')), 'Mangler bydel Grøndal');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Navne og type søgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='bebyggelser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.navn= 'Frederiksberg';
    options.qs.type= 'by';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bebyggelser= JSON.parse(response.body);
      assert(bebyggelser.length > 2, "Antal bebyggelser <= 3 (" + bebyggelser.length + ")");
      assert(bebyggelser.find(findNavn('Frederiksberg')), 'Mangler bydel Grøndal');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

})


describe('Nærmeste DAGI inddeling', function(){

  it("Knippelsbro 2", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.vejnavn= "Knippelsbro";
    options.qs.husnr= "2";
    options.qs.postnr= "1400";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adgangsadresser= JSON.parse(response.body);
      assert(adgangsadresser.length===1, "Der er ikke fundet én Knippelsbro 2");
      assert(adgangsadresser.sogn!==null, "Intet sogn");
      assert(adgangsadresser.retskreds!==null, "Ingen retskreds");
      assert(adgangsadresser.politikreds!==null, "Ingen politikreds");
      assert(adgangsadresser.opstillingskreds!==null, "Ingen opstillingskreds");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});


describe('Korttjenester', function(){

  it("WMS", function(done){
    var options= {};
    options.url='https://kort.aws.dk/geoserver/aws4_wms/wms';
    options.qs= {};
    options.qs.styles= "StandardStor";
    options.qs.servicename= "wms";
    options.qs.LAYERS= "adgangsadresser";
    options.qs.TRANSPARENT= "TRUE";
    options.qs.FORMAT= "image/png";
    options.qs.SERVICE= "WMS";
    options.qs.VERSION= "1.1.1";
    options.qs.REQUEST= "GetMap";
    options.qs.SRS= "EPSG:25832";
    options.qs.BBOX= "719910.4,6191212.8,719961.6,6191264";
    options.qs.WIDTH= "256";
    options.qs.HEIGHT= "256";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      //console.log(util.inspect(response.headers));
      assert(response.headers["content-type"]==="image/png", "content-type !== image/png");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("WFS", function(done){
    var options= {};
    options.url='https://kort.aws.dk/geoserver/aws4_wfs/wfs';
    options.qs= {};
    options.qs.SERVICE= "WFS";
    options.qs.REQUEST= "GetFeature";
    options.qs.VERSION= "2.0.0";
    options.qs.TYPENAMES= "aws4_wfs:adresser";
    options.qs.COUNT= 1;
    options.qs.SRSNAME= "urn:ogc:def:crs:EPSG::25832";
    options.qs.BBOX= "719910.4,6191212.8,719961.6,6191264,urn:ogc:def:crs:EPSG::25832";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      console.log(response.headers["content-type"]);
      assert(response.headers["content-type"]==="application/gml+xml; version=3.2", "content-type !== application/gml+xml; version=3.2");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

})


// describe('OIS', function(){

//   it("relation til adresse", function(done){
//     var options= {};
//     options.baseUrl= host;
//     options.url='adresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Lilledal 23, 1. tv, 3450 Allerød";
//     options.resolveWithFullResponse= true;
//     var jsonrequest= rp(options).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var adresser= JSON.parse(response.body);
//       assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//       var enhedopt= {};
//       enhedopt.baseUrl= host;
//       enhedopt.url='ois/enheder';
//       enhedopt.qs= {};
//       enhedopt.qs.cache= 'no-cache';
//       enhedopt.qs.adresseid= adresser[0].id;
//       enhedopt.resolveWithFullResponse= true;
//       var enhedrp= rp(enhedopt);

//       var opgangopt= {};
//       opgangopt.baseUrl= host;
//       opgangopt.url='ois/opgange';
//       opgangopt.qs= {};
//       opgangopt.qs.cache= enhedopt.qs.cache;
//       //console.log('adgangsadresseid: '+adresser[0].adgangsadresse.id);
//       opgangopt.qs.adgangsadresseid= adresser[0].adgangsadresse.id;
//       opgangopt.resolveWithFullResponse= true;
//       var opgangsrp= rp(opgangopt);

//       var bygningopt= {};
//       bygningopt.baseUrl= host;
//       bygningopt.url='ois/bygninger';
//       bygningopt.qs= {};
//       bygningopt.qs.cache= enhedopt.qs.cache;
//       //console.log('adgangsadresseid: '+adresser[0].adgangsadresse.id);
//       bygningopt.qs.adgangsadresseid= adresser[0].adgangsadresse.id;
//       bygningopt.resolveWithFullResponse= true;
//       var bygningrp= rp(bygningopt);

//       var tekniskanlægopt= {};
//       tekniskanlægopt.baseUrl= host;
//       tekniskanlægopt.url='ois/tekniskeanlaeg';
//       tekniskanlægopt.qs= {};
//       tekniskanlægopt.qs.cache= enhedopt.qs.cache;
//       //console.log('adgangsadresseid: '+adresser[0].adgangsadresse.id);
//       tekniskanlægopt.qs.adgangsadresseid= adresser[0].adgangsadresse.id;
//       tekniskanlægopt.resolveWithFullResponse= true;
//       var tekniskanlægrp= rp(tekniskanlægopt);

//       return Promise.all([enhedrp, bygningrp, tekniskanlægrp, opgangsrp]);
//     })
//     .then(function (responses) {
//       function callok(element, index, array) {          
//         return element.statusCode===200; 
//       } 
//       assert(responses.every(callok), "Http status code != 200");

//       // enhed        
//       var enheder= JSON.parse(responses[0].body);        
//       assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);

//       // bygninger        
//       var bygninger= JSON.parse(responses[1].body);        
//       assert(bygninger.length===0, "Der er fundet bygninger: " + bygninger.length);

//       // tekniske anlæg        
//       var tekniskanlæg= JSON.parse(responses[2].body);        
//       assert(tekniskanlæg.length===0, "Der er fundet tekniske anlæg: " + tekniskanlæg.length);

//       // opgange        
//       var opgange= JSON.parse(responses[3].body);        
//       assert(opgange.length===1, "Der er ikke fundet en opgang, men: " + tekniskanlæg.length);

//       var ejerskabopt= {};
//       ejerskabopt.baseUrl= host;
//       ejerskabopt.url='ois/ejerskaber';
//       ejerskabopt.qs= {};
//       ejerskabopt.qs.cache= 'no-cache';
//       ejerskabopt.qs.bbrid= /* '0'+ */ enheder[0].Enhed_id; // fjern '0' +
//       ejerskabopt.resolveWithFullResponse= true;
//       //console.log(ejerskabopt);
//       //console.log(util.inspect(enheder));
//       return rp(ejerskabopt);
//     })
//     .then(function (response) {
//       // ejerskab        
//       var ejerskab= JSON.parse(response.body);        
//       assert(ejerskab.length===1, "Der er ikke fundet ét ejerskab, men " + ejerskab.length);
//       done();
//     })
//     .catch((err) => {
//       done(err);
//     });
//   });


//   it("lejet rækkehus", function(done){
//     var options= {};
//     options.baseUrl= host;
//     options.url='adresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Rødkildevej 46, 2400 København NV";
//     options.resolveWithFullResponse= true;
//     var jsonrequest= rp(options).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var adresser= JSON.parse(response.body);
//       assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//       var enhedopt= {};
//       enhedopt.baseUrl= host;
//       enhedopt.url='ois/enheder';
//       enhedopt.qs= {};
//       enhedopt.qs.cache= 'no-cache';
//       enhedopt.qs.adresseid= adresser[0].id;
//       enhedopt.resolveWithFullResponse= true;
//       var enhedrp= rp(enhedopt);
//       return enhedrp;
//     }).then((response) => {      
//       assert(response.statusCode===200, "Http status code != 200");
//       var enheder= JSON.parse(response.body);          
//       assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);
//       assert(enheder[0].ejerskaber.length===0, "Der er fundet ejerskab i et lejet rækkehus");
//       assert(enheder[0].ENH_ANVEND_KODE===130, "Enhed er ikke et rækkehus");
//       assert(enheder[0].bygning.BYG_ANVEND_KODE===130, "Bygning er ikke et rækkehus");

//       var ejerskabopt= {};
//       ejerskabopt.baseUrl= host;
//       ejerskabopt.url='ois/ejerskaber';
//       ejerskabopt.qs= {};
//       ejerskabopt.qs.cache= 'no-cache';
//       ejerskabopt.qs.bbrid= enheder[0].Enhed_id;
//       // ejerskabopt.qs.kommunekode= enheder[0].bygning.KomKode;
//       // ejerskabopt.qs.esrejendomsnr= enheder[0].bygning.ESREjdNr; 
//       ejerskabopt.resolveWithFullResponse= true;
//       var ejerskabrp= rp(ejerskabopt);
//       return ejerskabrp;
//     }).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var ejerskaber= JSON.parse(response.body);          
//       assert(ejerskaber.length===0, "Der er ikke fundet nul ejerskab, men " + ejerskaber.length);
//       function grund(element, index, array) {          
//         return element.EntitetsType===1; 
//       } 
//       assert(ejerskaber.every(grund), "Ejerskab er ikke en grund");
//       done();
//     }).catch((err) => {
//       done(err);
//     });
//   });

//   it("ejerlejlighed", function(done){
//     var options= {};
//     options.baseUrl= host;
//     options.url='adresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Lilledal 23, 1. tv, 3450 Allerød";
//     options.resolveWithFullResponse= true;
//     var jsonrequest= rp(options).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var adresser= JSON.parse(response.body);
//       assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//       var enhedopt= {};
//       enhedopt.baseUrl= host;
//       enhedopt.url='ois/enheder';
//       enhedopt.qs= {};
//       enhedopt.qs.cache= 'no-cache';
//       enhedopt.qs.adresseid= adresser[0].id;
//       enhedopt.resolveWithFullResponse= true;
//       var enhedrp= rp(enhedopt);
//       return enhedrp;
//     }).then((response) => {      
//       assert(response.statusCode===200, "Http status code != 200");
//       var enheder= JSON.parse(response.body);          
//       assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);
//       assert(enheder[0].ejerskaber.length===1, "Der er ikke fundet ejerskab i et lejet rækkehus");
//       assert(enheder[0].ENH_ANVEND_KODE===140, "Enhed er ikke et etageboligbebyggelse");
//       assert(enheder[0].bygning.BYG_ANVEND_KODE===140, "Bygning er ikke et etageboligbebyggelse");
//       assert(enheder[0].bygning.ESREjdNr!==enheder[0].ejerskaber[0].ESREjdNr, "Enheds og bygnings esrejendomsnr er ens");
//       assert(enheder[0].ejerskaber[0].EntitetsType===3, "Enheds ejerskab er ikke en ejerlejlighed");

//       var ejerskabopt= {};
//       ejerskabopt.baseUrl= host;
//       ejerskabopt.url='ois/ejerskaber';
//       ejerskabopt.qs= {};
//       ejerskabopt.qs.cache= 'no-cache';
//       ejerskabopt.qs.bbrid= enheder[0].Enhed_id; 
//       ejerskabopt.resolveWithFullResponse= true;
//       var ejerskabrp= rp(ejerskabopt);
//       return ejerskabrp;
//     }).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var ejerskaber= JSON.parse(response.body);          
//       assert(ejerskaber.length===1, "Der er ikke fundet et ejerskab, men " + ejerskaber.length);
//       function enhed(element, index, array) {          
//         return element.EntitetsType===3; 
//       } 
//       assert(ejerskaber.every(enhed), "Ejerskab er ikke en grund eller bygning");
//       done();
//     }).catch((err) => {
//       done(err);
//     });
//   });

//   it("parcelhus", function(done){
//     var options= {};
//     options.baseUrl= host;
//     options.url='adresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Byagervej 9, 3450 Allerød";
//     options.resolveWithFullResponse= true;
//     var jsonrequest= rp(options).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var adresser= JSON.parse(response.body);
//       assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//       var enhedopt= {};
//       enhedopt.baseUrl= host;
//       enhedopt.url='ois/enheder';
//       enhedopt.qs= {};
//       enhedopt.qs.cache= 'no-cache';
//       enhedopt.qs.adresseid= adresser[0].id;
//       enhedopt.resolveWithFullResponse= true;
//       var enhedrp= rp(enhedopt);
//       return enhedrp;
//     }).then((response) => {      
//       assert(response.statusCode===200, "Http status code != 200");
//       var enheder= JSON.parse(response.body);          
//       assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);
//       assert(enheder[0].ejerskaber.length===0, "Der er fundet ejerskab i et parcelhus");
//       assert(enheder[0].ENH_ANVEND_KODE===120, "Enhed er ikke et parcelhus");
//       assert(enheder[0].bygning.BYG_ANVEND_KODE===120, "Bygning er ikke et parcelhus");
     
//       var eejerskabopt= {};
//       eejerskabopt.baseUrl= host;
//       eejerskabopt.url='ois/ejerskaber';
//       eejerskabopt.qs= {};
//       eejerskabopt.qs.cache= 'no-cache';
//       eejerskabopt.qs.bbrid= enheder[0].Enhed_id;  
//       eejerskabopt.resolveWithFullResponse= true;
//       var eejerskabrp= rp(eejerskabopt);

//       var bejerskabopt= {};
//       bejerskabopt.baseUrl= host;
//       bejerskabopt.url='ois/ejerskaber';
//       bejerskabopt.qs= {};
//       bejerskabopt.qs.cache= 'no-cache';
//       bejerskabopt.qs.kommunekode= enheder[0].bygning.KomKode;
//       bejerskabopt.qs.esrejendomsnr= enheder[0].bygning.ESREjdNr; 
//       bejerskabopt.resolveWithFullResponse= true;
//       var bejerskabrp= rp(bejerskabopt);

//       return Promise.all([eejerskabrp, bejerskabrp]);
//     }).then((responses) => {    
//       function callok(element, index, array) {          
//         return element.statusCode===200; 
//       } 
//       assert(responses.every(callok), "Http status code != 200");

//       var eejerskaber= JSON.parse(responses[0].body);      
//       //console.log(util.inspect(eejerskaber));           
//       assert(eejerskaber.length===0, "Der er fundet enhedsejerskab, antal: " + eejerskaber.length);

//       var bejerskaber= JSON.parse(responses[1].body);      
//       //console.log(util.inspect(bejerskaber));                  
//       assert(bejerskaber.length>=1, "Der er ikke fundet bygningsejerskab, antal: " + bejerskaber.length);

//       function grund(element, index, array) {          
//         return element.EntitetsType===1; 
//       } 
//       assert(bejerskaber.every(grund), "Ejerskab er ikke en grund");

//       done();
//     }).catch((err) => {
//       done(err);
//     });
//   });

//   it("teknisk anlæg", function(done){
//     var options= {};
//     options.baseUrl= host;
//     options.url='adgangsadresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Strengsholtvej 13, 9300 Sæby";
//     options.resolveWithFullResponse= true;
//     var jsonrequest= rp(options).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var adresser= JSON.parse(response.body);
//       assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//       var enhedopt= {};
//       enhedopt.baseUrl= host;
//       enhedopt.url='ois/tekniskeanlaeg';
//       enhedopt.qs= {};
//       enhedopt.qs.cache= 'no-cache';
//       enhedopt.qs.adgangsadresseid= adresser[0].id;
//       enhedopt.resolveWithFullResponse= true;
//       var enhedrp= rp(enhedopt);
//       return enhedrp;
//     }).then((response) => {      
//       assert(response.statusCode===200, "Http status code != 200");
//       var tekniskeanlæg= JSON.parse(response.body);          
//       assert(tekniskeanlæg.length>=1, "Der er ikke fundet ét teknisk anlæg, men " + tekniskeanlæg.length);
//       assert(tekniskeanlæg[0].ejerskaber.length===0, "Der er fundet ejerskab i det tekniske anlæg");
     
//       var ejerskabopt= {};
//       ejerskabopt.baseUrl= host;
//       ejerskabopt.url='ois/ejerskaber';
//       ejerskabopt.qs= {};
//       ejerskabopt.qs.cache= 'no-cache';
//       ejerskabopt.qs.kommunekode= tekniskeanlæg[0].KomKode;
//       ejerskabopt.qs.esrejendomsnr= tekniskeanlæg[0].ESREjdNr; 
//       ejerskabopt.resolveWithFullResponse= true;
//       var ejerskabrp= rp(ejerskabopt);
//       return ejerskabrp;
//     }).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var ejerskaber= JSON.parse(response.body);          
//       assert(ejerskaber.length===6, "Der er ikke fundet seks ejerskab, men " + ejerskaber.length);
//       function grund(element, index, array) {          
//         return element.EntitetsType===1; 
//       } 
//       assert(ejerskaber.every(grund), "Ejerskab er ikke en grund");
//       done();
//     }).catch((err) => {
//       done(err);
//     });
//   });

//  it("bygning på lejet grund", function(done){
//     var options= {};
//     options.baseUrl= host;
//     options.url='adgangsadresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Hjaltesvej 5A, 7800 Skive";
//     options.resolveWithFullResponse= true;
//     var jsonrequest= rp(options).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var adresser= JSON.parse(response.body);
//       assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//       var enhedopt= {};
//       enhedopt.baseUrl= host;
//       enhedopt.url='ois/opgange';
//       enhedopt.qs= {};
//       enhedopt.qs.cache= 'no-cache';
//       enhedopt.qs.adgangsadresseid= adresser[0].id;
//       enhedopt.resolveWithFullResponse= true;
//       var enhedrp= rp(enhedopt);
//       return enhedrp;
//     }).then((response) => {      
//       assert(response.statusCode===200, "Http status code != 200");
//       var opgange= JSON.parse(response.body);
//       assert(opgange.length===1, "Der er ikke fundet én "+options.qs.q); 

//       var enhedopt= {};
//       enhedopt.baseUrl= host;
//       enhedopt.url='ois/bygninger';
//       enhedopt.qs= {};
//       enhedopt.qs.cache= 'no-cache';
//       enhedopt.qs.id= opgange[0].Bygning_id;
//       enhedopt.resolveWithFullResponse= true;
//       var enhedrp= rp(enhedopt);
//       return enhedrp;
//     }).then((response) => {      
//       assert(response.statusCode===200, "Http status code != 200");
//       var bygninger= JSON.parse(response.body);          
//       assert(bygninger.length>=1, "Der er ikke fundet én bygning, men " + bygninger.length);
//       assert(bygninger[0].ejerskaber.length===1, "Der er ikke fundet ét ejerskab i bygningen, men " + bygninger[0].ejerskaber.length);
     
//       var ejerskabopt= {};
//       ejerskabopt.baseUrl= host;
//       ejerskabopt.url='ois/ejerskaber';
//       ejerskabopt.qs= {};
//       ejerskabopt.qs.cache= 'no-cache';
//       ejerskabopt.qs.kommunekode= bygninger[0].KomKode;
//       ejerskabopt.qs.esrejendomsnr= bygninger[0].ESREjdNr; 
//       ejerskabopt.resolveWithFullResponse= true;
//       var ejerskabrp= rp(ejerskabopt);
//       return ejerskabrp;
//     }).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var ejerskaber= JSON.parse(response.body);          
//       assert(ejerskaber.length===1, "Der er ikke fundet ét ejerskab, men " + ejerskaber.length);
//       function grund(element, index, array) {          
//         return element.EntitetsType===1; 
//       } 
//       assert(ejerskaber.every(grund), "Ejerskab er ikke en grund");
//       done();
//     }).catch((err) => {
//       done(err);
//     });
//   });


//  // it("bygning på lejet grund", function(done){
//  //    var options= {};
//  //    options.baseUrl= host;
//  //    options.url='adgangsadresser';
//  //    options.qs= {};
//  //    options.qs.cache= 'no-cache';
//  //    options.qs.q= "Østergade 24A, 9370 Hals";
//  //    options.resolveWithFullResponse= true;
//  //    var jsonrequest= rp(options).then((response) => {
//  //      assert(response.statusCode===200, "Http status code != 200");
//  //      var adresser= JSON.parse(response.body);
//  //      assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//  //      var enhedopt= {};
//  //      enhedopt.baseUrl= host;
//  //      enhedopt.url='ois/bygninger';
//  //      enhedopt.qs= {};
//  //      enhedopt.qs.cache= 'no-cache';
//  //      enhedopt.qs.adgangsadresseid= adresser[0].id;
//  //      enhedopt.resolveWithFullResponse= true;
//  //      var enhedrp= rp(enhedopt);
//  //      return enhedrp;
//  //    }).then((response) => {      
//  //      assert(response.statusCode===200, "Http status code != 200");
//  //      var bygninger= JSON.parse(response.body);          
//  //      assert(bygninger.length>=1, "Der er ikke fundet én bygning, men " + bygninger.length);
//  //      assert(bygninger[0].ejerskaber.length===1, "Der er ikke fundet ejerskab i bygningen");
     
//  //      var ejerskabopt= {};
//  //      ejerskabopt.baseUrl= host;
//  //      ejerskabopt.url='ois/ejerskaber';
//  //      ejerskabopt.qs= {};
//  //      ejerskabopt.qs.cache= 'no-cache';
//  //      ejerskabopt.qs.kommunekode= bygninger[0].KomKode;
//  //      ejerskabopt.qs.esrejendomsnr= bygninger[0].ESREjdNr; 
//  //      ejerskabopt.resolveWithFullResponse= true;
//  //      var ejerskabrp= rp(ejerskabopt);
//  //      return ejerskabrp;
//  //    }).then((response) => {
//  //      assert(response.statusCode===200, "Http status code != 200");
//  //      var ejerskaber= JSON.parse(response.body);          
//  //      assert(ejerskaber.length===1, "Der er ikke fundet syv ejerskab, men " + ejerskaber.length);
//  //      function grund(element, index, array) {          
//  //        return element.EntitetsType===1; 
//  //      } 
//  //      assert(ejerskaber.every(grund), "Ejerskab er ikke en grund");
//  //      done();
//  //    }).catch((err) => {
//  //      done(err);
//  //    });
//  //  });


//  it("fra ejerskab til adresse", function(done) {
//     var ejerskabopt= {};
//     ejerskabopt.baseUrl= host;
//     ejerskabopt.url='ois/ejerskaber';
//     ejerskabopt.qs= {};
//     ejerskabopt.qs.cache= 'no-cache';
//     ejerskabopt.qs.kommunekode= "0201";
//     ejerskabopt.qs.esrejendomsnr= "094995"; 
//     ejerskabopt.resolveWithFullResponse= true;
//     var ejerskabrp= rp(ejerskabopt);
//     ejerskabrp.then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var ejerskaber= JSON.parse(response.body);  
//       assert(ejerskaber.length===1, "Der er ikke fundet ét ejerskab, men " + ejerskaber.length);                
//       var options= {};
//       options.baseUrl= host;
//       options.url='adresser';
//       options.qs= {};
//       options.qs.cache= 'no-cache';
//       options.qs.id= ejerskaber[0].enhed.EnhAdr_id;
//       options.resolveWithFullResponse= true;
//       return rp(options);
//     }).then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var adresser= JSON.parse(response.body);          
//       assert(adresser.length===1, "Der er ikke fundet en adresse, men " + adresser.length);
//       assert(adresser[0].adressebetegnelse.localeCompare("Lilledal 23, 1. tv, 3450 Allerød")===0, "Adressen er ikke Lilledal 23, 1. tv, 3450 Allerød");
//       done();
//     }).catch((err) => {
//       done(err);
//     });
//   });

//  it("reverse geokodning af bygning", function(done) {
//     var reverseopt= {};
//     reverseopt.baseUrl= host;
//     reverseopt.url='ois/bygninger';
//     reverseopt.qs= {};
//     reverseopt.qs.cache= 'no-cache';
//     reverseopt.qs.x= 12.5108572474172;
//     reverseopt.qs.y= 55.6983973831476; 
//     reverseopt.resolveWithFullResponse= true;
//     var reverserp= rp(reverseopt);       
//     reverserp.then((response) => {
//       assert(response.statusCode===200, "Http status code != 200");
//       var bygninger= JSON.parse(response.body);
//       assert(bygninger.length===1, "Der er ikke fundet én bygning, men " + bygninger.length);                
//       assert(bygninger[0].BYG_ANVEND_KODE===930, "Det er ikke et udhus (930), men " + bygninger[0].BYG_ANVEND_KODE);
//       assert(bygninger[0].OPFOERELSE_AAR===1921, "Det er ikke opført i 1921, men " + bygninger[0].OPFOERELSE_AAR);
//       done();
//     }).catch((err) => {
//       done(err);
//     });
//   });


// });

describe('BBR Light', function(){

  it("relation til adresse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.q= "Lilledal 23, 1. tv, 3450 Allerød";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresser= JSON.parse(response.body);
      assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

      var enhedopt= {};
      enhedopt.baseUrl= host;
      enhedopt.url='bbrlight/enheder';
      enhedopt.qs= {};
      enhedopt.qs.cache= 'no-cache';
      enhedopt.qs.adresseid= adresser[0].id;
      enhedopt.resolveWithFullResponse= true;
      var enhedrp= rp(enhedopt);

      var opgangopt= {};
      opgangopt.baseUrl= host;
      opgangopt.url='bbrlight/opgange';
      opgangopt.qs= {};
      opgangopt.qs.cache= enhedopt.qs.cache;
      //console.log('adgangsadresseid: '+adresser[0].adgangsadresse.id);
      opgangopt.qs.adgangsadresseid= adresser[0].adgangsadresse.id;
      opgangopt.resolveWithFullResponse= true;
      var opgangsrp= rp(opgangopt);

      var bygningopt= {};
      bygningopt.baseUrl= host;
      bygningopt.url='bbrlight/bygninger';
      bygningopt.qs= {};
      bygningopt.qs.cache= enhedopt.qs.cache;
      //console.log('adgangsadresseid: '+adresser[0].adgangsadresse.id);
      bygningopt.qs.adgangsadresseid= adresser[0].adgangsadresse.id;
      bygningopt.resolveWithFullResponse= true;
      var bygningrp= rp(bygningopt);

      var tekniskanlægopt= {};
      tekniskanlægopt.baseUrl= host;
      tekniskanlægopt.url='bbrlight/tekniskeanlaeg';
      tekniskanlægopt.qs= {};
      tekniskanlægopt.qs.cache= enhedopt.qs.cache;
      //console.log('adgangsadresseid: '+adresser[0].adgangsadresse.id);
      tekniskanlægopt.qs.adgangsadresseid= adresser[0].adgangsadresse.id;
      tekniskanlægopt.resolveWithFullResponse= true;
      var tekniskanlægrp= rp(tekniskanlægopt);

      return Promise.all([enhedrp, bygningrp, tekniskanlægrp, opgangsrp]);
    })
    .then(function (responses) {
      function callok(element, index, array) {          
        return element.statusCode===200; 
      } 
      assert(responses.every(callok), "Http status code != 200");

      // enhed        
      var enheder= JSON.parse(responses[0].body);        
      assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);

      // bygninger        
      var bygninger= JSON.parse(responses[1].body);        
      assert(bygninger.length===0, "Der er fundet bygninger: " + bygninger.length);

      // tekniske anlæg        
      var tekniskanlæg= JSON.parse(responses[2].body);        
      assert(tekniskanlæg.length===0, "Der er fundet tekniske anlæg: " + tekniskanlæg.length);

      // opgange        
      var opgange= JSON.parse(responses[3].body);        
      assert(opgange.length===1, "Der er ikke fundet en opgang, men: " + tekniskanlæg.length);

      var ejerskabopt= {};
      ejerskabopt.baseUrl= host;
      ejerskabopt.url='bbrlight/ejerskaber';
      ejerskabopt.qs= {};
      ejerskabopt.qs.cache= 'no-cache';
      ejerskabopt.qs.bbrid= /* '0'+ */ enheder[0].Enhed_id; // fjern '0' +
      ejerskabopt.resolveWithFullResponse= true;
      //console.log(ejerskabopt);
      //console.log(util.inspect(enheder));
      return rp(ejerskabopt);
    })
    .then(function (response) {
      // ejerskab        
      var ejerskab= JSON.parse(response.body);        
      assert(ejerskab.length===1, "Der er ikke fundet ét ejerskab, men " + ejerskab.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });


  it("lejet rækkehus", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.q= "Rødkildevej 46, 2400 København NV";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresser= JSON.parse(response.body);
      assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

      var enhedopt= {};
      enhedopt.baseUrl= host;
      enhedopt.url='bbrlight/enheder';
      enhedopt.qs= {};
      enhedopt.qs.cache= 'no-cache';
      enhedopt.qs.adresseid= adresser[0].id;
      enhedopt.resolveWithFullResponse= true;
      var enhedrp= rp(enhedopt);
      return enhedrp;
    }).then((response) => {      
      assert(response.statusCode===200, "Http status code != 200");
      var enheder= JSON.parse(response.body);          
      assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);
      assert(enheder[0].ejerskaber.length===0, "Der er fundet ejerskab i et lejet rækkehus");
      //assert(typeof enheder[0].ENH_ANVEND_KODE === 'undefined', "Enhedens anvendelseskode er med");
      //assert(typeof enheder[0].bygning.BYG_ANVEND_KODE === 'undefined', "Bygningens anvendelseskode er med");

      var ejerskabopt= {};
      ejerskabopt.baseUrl= host;
      ejerskabopt.url='bbrlight/ejerskaber';
      ejerskabopt.qs= {};
      ejerskabopt.qs.cache= 'no-cache';
      ejerskabopt.qs.bbrid= enheder[0].Enhed_id;
      // ejerskabopt.qs.kommunekode= enheder[0].bygning.KomKode;
      // ejerskabopt.qs.esrejendomsnr= enheder[0].bygning.ESREjdNr; 
      ejerskabopt.resolveWithFullResponse= true;
      var ejerskabrp= rp(ejerskabopt);
      return ejerskabrp;
    }).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var ejerskaber= JSON.parse(response.body);          
      assert(ejerskaber.length===0, "Der er ikke fundet nul ejerskab, men " + ejerskaber.length);
      function grund(element, index, array) {          
        return element.EntitetsType===1; 
      } 
      assert(ejerskaber.every(grund), "Ejerskab er ikke en grund");
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it("ejerlejlighed", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.q= "Lilledal 23, 1. tv, 3450 Allerød";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresser= JSON.parse(response.body);
      assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

      var enhedopt= {};
      enhedopt.baseUrl= host;
      enhedopt.url='bbrlight/enheder';
      enhedopt.qs= {};
      enhedopt.qs.cache= 'no-cache';
      enhedopt.qs.adresseid= adresser[0].id;
      enhedopt.resolveWithFullResponse= true;
      var enhedrp= rp(enhedopt);
      return enhedrp;
    }).then((response) => {      
      assert(response.statusCode===200, "Http status code != 200");
      var enheder= JSON.parse(response.body);          
      assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);
      assert(enheder[0].ejerskaber.length===1, "Der er ikke fundet ejerskab i et lejet rækkehus");
      //assert(typeof enheder[0].ENH_ANVEND_KODE === 'undefined', "Enhedens anvendelseskode er med");
      //assert(typeof enheder[0].bygning.BYG_ANVEND_KODE === 'undefined', "Bygningens anvendelseskode er med");
      assert(enheder[0].bygning.ESREjdNr!==enheder[0].ejerskaber[0].ESREjdNr, "Enheds og bygnings esrejendomsnr er ens");
      assert(enheder[0].ejerskaber[0].EntitetsType===3, "Enheds ejerskab er ikke en ejerlejlighed");

      var ejerskabopt= {};
      ejerskabopt.baseUrl= host;
      ejerskabopt.url='bbrlight/ejerskaber';
      ejerskabopt.qs= {};
      ejerskabopt.qs.cache= 'no-cache';
      ejerskabopt.qs.bbrid= enheder[0].Enhed_id; 
      ejerskabopt.resolveWithFullResponse= true;
      var ejerskabrp= rp(ejerskabopt);
      return ejerskabrp;
    }).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var ejerskaber= JSON.parse(response.body);          
      assert(ejerskaber.length===1, "Der er ikke fundet et ejerskab, men " + ejerskaber.length);
      function enhed(element, index, array) {          
        return element.EntitetsType===3; 
      } 
      assert(ejerskaber.every(enhed), "Ejerskab er ikke en grund eller bygning");
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it("parcelhus", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.q= "Byagervej 9, 3450 Allerød";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresser= JSON.parse(response.body);
      assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

      var enhedopt= {};
      enhedopt.baseUrl= host;
      enhedopt.url='bbrlight/enheder';
      enhedopt.qs= {};
      enhedopt.qs.cache= 'no-cache';
      enhedopt.qs.adresseid= adresser[0].id;
      enhedopt.resolveWithFullResponse= true;
      var enhedrp= rp(enhedopt);
      return enhedrp;
    }).then((response) => {      
      assert(response.statusCode===200, "Http status code != 200");
      var enheder= JSON.parse(response.body);          
      assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);
      assert(enheder[0].ejerskaber.length===0, "Der er fundet ejerskab i et parcelhus");
      //assert(typeof enheder[0].ENH_ANVEND_KODE === 'undefined', "Enhedens anvendelseskode er med");
      //assert(typeof enheder[0].bygning.BYG_ANVEND_KODE === 'undefined', "Bygningens anvendelseskode er med");
     
      var eejerskabopt= {};
      eejerskabopt.baseUrl= host;
      eejerskabopt.url='bbrlight/ejerskaber';
      eejerskabopt.qs= {};
      eejerskabopt.qs.cache= 'no-cache';
      eejerskabopt.qs.bbrid= enheder[0].Enhed_id;  
      eejerskabopt.resolveWithFullResponse= true;
      var eejerskabrp= rp(eejerskabopt);

      var bejerskabopt= {};
      bejerskabopt.baseUrl= host;
      bejerskabopt.url='bbrlight/ejerskaber';
      bejerskabopt.qs= {};
      bejerskabopt.qs.cache= 'no-cache';
      bejerskabopt.qs.kommunekode= enheder[0].bygning.KomKode;
      bejerskabopt.qs.esrejendomsnr= enheder[0].bygning.ESREjdNr; 
      bejerskabopt.resolveWithFullResponse= true;
      var bejerskabrp= rp(bejerskabopt);

      return Promise.all([eejerskabrp, bejerskabrp]);
    }).then((responses) => {    
      function callok(element, index, array) {          
        return element.statusCode===200; 
      } 
      assert(responses.every(callok), "Http status code != 200");

      var eejerskaber= JSON.parse(responses[0].body);      
      //console.log(util.inspect(eejerskaber));           
      assert(eejerskaber.length===0, "Der er fundet enhedsejerskab, antal: " + eejerskaber.length);

      var bejerskaber= JSON.parse(responses[1].body);      
      //console.log(util.inspect(bejerskaber));                  
      assert(bejerskaber.length>=1, "Der er ikke fundet bygningsejerskab, antal: " + bejerskaber.length);

      function grund(element, index, array) {          
        return element.EntitetsType===1; 
      } 
      assert(bejerskaber.every(grund), "Ejerskab er ikke en grund");

      done();
    }).catch((err) => {
      done(err);
    });
  });

  it("teknisk anlæg", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.q= "Strengsholtvej 13, 9300 Sæby";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresser= JSON.parse(response.body);
      assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

      var enhedopt= {};
      enhedopt.baseUrl= host;
      enhedopt.url='bbrlight/tekniskeanlaeg';
      enhedopt.qs= {};
      enhedopt.qs.cache= 'no-cache';
      enhedopt.qs.adgangsadresseid= adresser[0].id;
      enhedopt.resolveWithFullResponse= true;
      var enhedrp= rp(enhedopt);
      return enhedrp;
    }).then((response) => {      
      assert(response.statusCode===200, "Http status code != 200");
      var tekniskeanlæg= JSON.parse(response.body);          
      assert(tekniskeanlæg.length>=1, "Der er ikke fundet ét teknisk anlæg, men " + tekniskeanlæg.length);
      assert(tekniskeanlæg[0].ejerskaber.length===0, "Der er fundet ejerskab i det tekniske anlæg");
     
      var ejerskabopt= {};
      ejerskabopt.baseUrl= host;
      ejerskabopt.url='bbrlight/ejerskaber';
      ejerskabopt.qs= {};
      ejerskabopt.qs.cache= 'no-cache';
      ejerskabopt.qs.kommunekode= tekniskeanlæg[0].KomKode;
      ejerskabopt.qs.esrejendomsnr= tekniskeanlæg[0].ESREjdNr; 
      ejerskabopt.resolveWithFullResponse= true;
      var ejerskabrp= rp(ejerskabopt);
      return ejerskabrp;
    }).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var ejerskaber= JSON.parse(response.body);          
      assert(ejerskaber.length===6, "Der er ikke fundet seks ejerskab, men " + ejerskaber.length);
      function grund(element, index, array) {          
        return element.EntitetsType===1; 
      } 
      assert(ejerskaber.every(grund), "Ejerskab er ikke en grund");
      done();
    }).catch((err) => {
      done(err);
    });
  });

 it("bygning på lejet grund", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.q= "Hjaltesvej 5A, 7800 Skive";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresser= JSON.parse(response.body);
      assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

      var enhedopt= {};
      enhedopt.baseUrl= host;
      enhedopt.url='bbrlight/opgange';
      enhedopt.qs= {};
      enhedopt.qs.cache= 'no-cache';
      enhedopt.qs.adgangsadresseid= adresser[0].id;
      enhedopt.resolveWithFullResponse= true;
      var enhedrp= rp(enhedopt);
      return enhedrp;
    }).then((response) => {      
      assert(response.statusCode===200, "Http status code != 200");
      var opgange= JSON.parse(response.body);
      assert(opgange.length===1, "Der er ikke fundet én "+options.qs.q); 

      var enhedopt= {};
      enhedopt.baseUrl= host;
      enhedopt.url='bbrlight/bygninger';
      enhedopt.qs= {};
      enhedopt.qs.cache= 'no-cache';
      enhedopt.qs.id= opgange[0].Bygning_id;
      enhedopt.resolveWithFullResponse= true;
      var enhedrp= rp(enhedopt);
      return enhedrp;
    }).then((response) => {      
      assert(response.statusCode===200, "Http status code != 200");
      var bygninger= JSON.parse(response.body);          
      assert(bygninger.length>=1, "Der er ikke fundet én bygning, men " + bygninger.length);
      assert(bygninger[0].ejerskaber.length===1, "Der er ikke fundet ét ejerskab i bygningen, men " + bygninger[0].ejerskaber.length);
     
      var ejerskabopt= {};
      ejerskabopt.baseUrl= host;
      ejerskabopt.url='bbrlight/ejerskaber';
      ejerskabopt.qs= {};
      ejerskabopt.qs.cache= 'no-cache';
      ejerskabopt.qs.kommunekode= bygninger[0].KomKode;
      ejerskabopt.qs.esrejendomsnr= bygninger[0].ESREjdNr; 
      ejerskabopt.resolveWithFullResponse= true;
      var ejerskabrp= rp(ejerskabopt);
      return ejerskabrp;
    }).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var ejerskaber= JSON.parse(response.body);          
      assert(ejerskaber.length===1, "Der er ikke fundet ét ejerskab, men " + ejerskaber.length);
      function grund(element, index, array) {          
        return element.EntitetsType===1; 
      } 
      assert(ejerskaber.every(grund), "Ejerskab er ikke en grund");
      done();
    }).catch((err) => {
      done(err);
    });
  });


 // it("bygning på lejet grund", function(done){
 //    var options= {};
 //    options.baseUrl= host;
 //    options.url='adgangsadresser';
 //    options.qs= {};
 //    options.qs.cache= 'no-cache';
 //    options.qs.q= "Østergade 24A, 9370 Hals";
 //    options.resolveWithFullResponse= true;
 //    var jsonrequest= rp(options).then((response) => {
 //      assert(response.statusCode===200, "Http status code != 200");
 //      var adresser= JSON.parse(response.body);
 //      assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

 //      var enhedopt= {};
 //      enhedopt.baseUrl= host;
 //      enhedopt.url='ois/bygninger';
 //      enhedopt.qs= {};
 //      enhedopt.qs.cache= 'no-cache';
 //      enhedopt.qs.adgangsadresseid= adresser[0].id;
 //      enhedopt.resolveWithFullResponse= true;
 //      var enhedrp= rp(enhedopt);
 //      return enhedrp;
 //    }).then((response) => {      
 //      assert(response.statusCode===200, "Http status code != 200");
 //      var bygninger= JSON.parse(response.body);          
 //      assert(bygninger.length>=1, "Der er ikke fundet én bygning, men " + bygninger.length);
 //      assert(bygninger[0].ejerskaber.length===1, "Der er ikke fundet ejerskab i bygningen");
     
 //      var ejerskabopt= {};
 //      ejerskabopt.baseUrl= host;
 //      ejerskabopt.url='ois/ejerskaber';
 //      ejerskabopt.qs= {};
 //      ejerskabopt.qs.cache= 'no-cache';
 //      ejerskabopt.qs.kommunekode= bygninger[0].KomKode;
 //      ejerskabopt.qs.esrejendomsnr= bygninger[0].ESREjdNr; 
 //      ejerskabopt.resolveWithFullResponse= true;
 //      var ejerskabrp= rp(ejerskabopt);
 //      return ejerskabrp;
 //    }).then((response) => {
 //      assert(response.statusCode===200, "Http status code != 200");
 //      var ejerskaber= JSON.parse(response.body);          
 //      assert(ejerskaber.length===1, "Der er ikke fundet syv ejerskab, men " + ejerskaber.length);
 //      function grund(element, index, array) {          
 //        return element.EntitetsType===1; 
 //      } 
 //      assert(ejerskaber.every(grund), "Ejerskab er ikke en grund");
 //      done();
 //    }).catch((err) => {
 //      done(err);
 //    });
 //  });


 it("fra ejerskab til adresse", function(done) {
    var ejerskabopt= {};
    ejerskabopt.baseUrl= host;
    ejerskabopt.url='bbrlight/ejerskaber';
    ejerskabopt.qs= {};
    ejerskabopt.qs.cache= 'no-cache';
    ejerskabopt.qs.kommunekode= "0201";
    ejerskabopt.qs.esrejendomsnr= "094995"; 
    ejerskabopt.resolveWithFullResponse= true;
    var ejerskabrp= rp(ejerskabopt);
    ejerskabrp.then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var ejerskaber= JSON.parse(response.body);  
      assert(ejerskaber.length===1, "Der er ikke fundet ét ejerskab, men " + ejerskaber.length);                
      var options= {};
      options.baseUrl= host;
      options.url='adresser';
      options.qs= {};
      options.qs.cache= 'no-cache';
      options.qs.id= ejerskaber[0].enhed.EnhAdr_id;
      options.resolveWithFullResponse= true;
      return rp(options);
    }).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresser= JSON.parse(response.body);          
      assert(adresser.length===1, "Der er ikke fundet en adresse, men " + adresser.length);
      assert(adresser[0].adressebetegnelse.localeCompare("Lilledal 23, 1. tv, 3450 Allerød")===0, "Adressen er ikke Lilledal 23, 1. tv, 3450 Allerød");
      done();
    }).catch((err) => {
      done(err);
    });
  });

 it("reverse geokodning af bygning", function(done) {
    var reverseopt= {};
    reverseopt.baseUrl= host;
    reverseopt.url='bbrlight/bygninger';
    reverseopt.qs= {};
    reverseopt.qs.cache= 'no-cache';
    reverseopt.qs.x= 12.5108572474172;
    reverseopt.qs.y= 55.6983973831476; 
    reverseopt.resolveWithFullResponse= true;
    var reverserp= rp(reverseopt);       
    reverserp.then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bygninger= JSON.parse(response.body);
      assert(bygninger.length===1, "Der er ikke fundet én bygning, men " + bygninger.length);                
      //assert(typeof bygninger[0].BYG_ANVEND_KODE==='undefined', "Bygningens anvendelseskode er med");
      //assert(typeof bygninger[0].OPFOERELSE_AAR==='undefined', "Bygningens opførelsesår er med");
      done();
    }).catch((err) => {
      done(err);
    });
  });


 it("geojson", function(done) {
    var reverseopt= {};
    reverseopt.baseUrl= host;
    reverseopt.url='bbrlight/bygninger';
    reverseopt.qs= {};
    reverseopt.qs.cache= 'no-cache';
    reverseopt.qs.id= '0000247a-4beb-4e08-8217-d3246a66ffc3';
    reverseopt.qs.format= 'geojson';
    reverseopt.resolveWithFullResponse= true;
    var reverserp= rp(reverseopt);       
    reverserp.then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bygninger= JSON.parse(response.body);
      assert(bygninger.features.length===1, "Der er flere end én bygning, men " + bygninger.features.length); 
      //assert(typeof bygninger.features[0].properties.BYG_ANVEND_KODE==='undefined', "Bygningens anvendelseskode er med");
      //assert(typeof bygninger.features[0].properties.OPFOERELSE_AAR==='undefined', "Bygningens opførelsesår er med");
      done();
    }).catch((err) => {
      done(err);
    });
  });


  it("Grund", function(done) {
    var grundopt= {};
    grundopt.baseUrl= host;
    grundopt.url='bbrlight/grunde';
    grundopt.qs= {};
    grundopt.qs.cache= 'no-cache';
    grundopt.qs.adgangsadresseid= '0a3f507e-436a-32b8-e044-0003ba298018';
    grundopt.resolveWithFullResponse= true;
    var reverserp= rp(grundopt);       
    reverserp.then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var grunde= JSON.parse(response.body);
      assert(grunde.length===1, "Der er flere end én grund, men " + grunde.length); 
      assert(grunde[0].AdgAdr_id.localeCompare(grundopt.qs.adgangsadresseid) === 0, "Forkert adgangsadresseid");
      done();
    }).catch((err) => {
      done(err);
    });
  });

});

// describe('GRBBR', function(){


//   it("test af  manglende enhed samt manglende bygningsreference på enhed", async function(){

//     // finde adresse
//     let options= {};
//     options.baseUrl= host;
//     options.url='adresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Lilledal 23, 1. tv, 3450 Allerød";
//     options.resolveWithFullResponse= true;
//     let response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     let adresser= JSON.parse(response.body);
//     assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//     // find adressens enhed
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/enheder';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.status= 6;
//     options.qs.adresse_id= adresser[0].id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     let enheder= JSON.parse(response.body);
//     assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);
//     assert(enheder[0].enh020EnhedensAnvendelse==='140', 'Enheden er ikke en Etagebolig-bygning, flerfamiliehus eller to-familiehus');

//     // find enhedens bygning
//     options= {};
//     assert(enheder[0].bygning, 'Enhedens byning mangler');
//     options.url=enheder[0].bygning.href;
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.status= 6;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     let bygning= JSON.parse(response.body);
//     assert(bygning.byg021BygningensAnvendelse==='140', 'Bygningen er ikke en Etagebolig-bygning, flerfamiliehus eller to-familiehus');
//   });


//   it("adresse til oplysninger om enhed", async function() {

//     // finde adresse
//     var options= {};
//     options.baseUrl= host;
//     options.url='adresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Teglbrændervej 1, st. th, 2400 København NV";
//     options.resolveWithFullResponse= true;
//     let response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var adresser= JSON.parse(response.body);
//     assert(adresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//     // find adressens enhed
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/enheder';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.status= 6;
//     options.qs.adresse_id= adresser[0].id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var enheder= JSON.parse(response.body);
//     assert(enheder.length===1, "Der er ikke fundet én enhed, men " + enheder.length);
//     assert(enheder[0].enh020EnhedensAnvendelse==='140', 'Enheden er ikk en Etagebolig-bygning, flerfamiliehus eller to-familiehus');

//     // undersøg om enheden er en ejerlejlighed
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/enhedejerlejlighed';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.enhed_id= enheder[0].id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var ejerlejligheder= JSON.parse(response.body);
//     assert(ejerlejligheder.length===1, "Der er ikke fundet én ejerlejligheder, men " + ejerlejligheder.length);


//     // find ejendomsoplysninger
//     options= {};
//     options.url=ejerlejligheder[0].ejerlejlighed.href;
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.enhed_id= enheder[0].id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var ejendom= JSON.parse(response.body);
//     assert(ejendom.ejendomstype==='Ejerlejlighed', "Ejendommen er ikke en lejlighed, men " + ejendom.ejendomstype);

//     // opgang
//     options= {};
//     options.url=enheder[0].opgang.href;
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var opgang= JSON.parse(response.body);
//     assert(opgang.opg020Elevator==='0', "Der er fundet elevator i opgangen");

//     // etage
//     options= {};
//     options.url=enheder[0].etage.href;
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var etage= JSON.parse(response.body);
//     assert(etage.eta006BygningensEtagebetegnelse==='st', "Etage er ikke st"); 

//     // teknisk anlæg
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/tekniskeanlaeg';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.enhed_id= enheder[0].id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var tekniskeanlæg= JSON.parse(response.body);
//     assert(tekniskeanlæg.length===0, "Der er fundet " + tekniskeanlæg.length + 'tekniske anlæg'); 
//   });


//   it("adgangsadresse til oplysninger om bygning", async function(){

//     // finde adresse
//     var options= {};
//     options.baseUrl= host;
//     options.url='adgangsadresser';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.q= "Teglbrændervej 1, 2400 København NV";
//     options.resolveWithFullResponse= true;
//     let response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var adgangsadresser= JSON.parse(response.body);
//     assert(adgangsadresser.length===1, "Der er ikke fundet én "+options.qs.q); 

//     // find adgangsadressens opgang
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/opgange';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.status= 6;
//     options.qs.husnummer_id= adgangsadresser[0].id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var opgange= JSON.parse(response.body);
//     assert(opgange.length===1, "Der er ikke fundet én opgang, men " + opgange.length);

//     // find adgangsadressens bygning
//     options= {};
//     options.url=opgange[0].bygning.href;
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.status= 6;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var bygning= JSON.parse(response.body);
//     assert(bygning.byg021BygningensAnvendelse==='140', 'Bygningen er ikk en Etagebolig-bygning, flerfamiliehus eller to-familiehus');

//     // undersøg om bygningen er en bygningpaafremmedgrund
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/bygningpaafremmedgrund';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.bygning_id= bygning.id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var bygningerpaafremmedgrund= JSON.parse(response.body);
//     assert(bygningerpaafremmedgrund.length===0, "Der er ikke fundet én bygningpaafremmedgrund, men " + bygningerpaafremmedgrund.length);


//     if (bygningerpaafremmedgrund.length>0) {
//       // find ejendomsoplysninger for bygning på fremmed grund
//       options= {};
//       options.url=bygningerpaafremmedgrund[0].bygningPåFremmedGrund.href;
//       options.qs= {};
//       options.qs.cache= 'no-cache';
//       options.resolveWithFullResponse= true;
//       response=  await rp(options);    
//       assert(response.statusCode===200, "Http status code != 200");
//       var ejendom= JSON.parse(response.body);
//       assert(ejendom.ejendomstype==='BPFG', "Ejendommen er ikke en bygning på fremmed grund, men " + ejendom.ejendomstype);
//     }

//     // opgange
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/opgange';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.bygning_id= bygning.id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var opgange= JSON.parse(response.body);
//     assert(opgange.length===4, 'Der er fundet ' + opgange.length + ' opgange');

//     // opgangens enheder
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/enheder';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.opgang_id= opgange[0].id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var opgangensenheder= JSON.parse(response.body);
//     assert(opgangensenheder.length===6, 'Der er fundet ' + opgangensenheder.length + ' enheder på opgangen');

//     // etager
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/etager';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.bygning_id= bygning.id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var etager= JSON.parse(response.body);
//     assert(etager.length===6, 'Der er fundet ' + etager.length + ' etager');

//     // etagens enheder
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/enheder';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.etage_id= etager[0].id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var etagensenheder= JSON.parse(response.body);
//     assert(etagensenheder.length===3, 'Der er fundet ' + etagensenheder.length + ' etagens enheder');

//     // grunden bygningen ligger på
//     options= {};
//     options.url=bygning.grund.href;
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var grund= JSON.parse(response.body);
//     assert(grund.gru009Vandforsyning==='1', "Vandforsyningen er " + grund.gru009Vandforsyning); 

//     // grundens jordstykker
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/grundjordstykke';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.grund_id= grund.id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var grundjordstykker= JSON.parse(response.body);
//     assert(grundjordstykker.length===1, 'Der er fundet ' + grundjordstykker.length + ' grundjordstykker');
//     assert(grundjordstykker[0].jordstykke.id===bygning.jordstykke.id, 'Jordstykket tilknyttet grunden (' + grundjordstykker[0].id + ') er forskelligt fra jordstykket tilknyttet bygningen (' + bygning.jordstykke.id + ')');
  
//     // jordstykket
//     options= {};
//     options.baseUrl= host;
//     options.url='jordstykker';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.featureid= grundjordstykker[0].jordstykke.id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var jordstykker= JSON.parse(response.body);
//     assert(jordstykker.length===1, 'Der er fundet ' + jordstykker.length + ' jordstykker');
   
//     // teknisk anlæg
//     options= {};
//     options.baseUrl= host;
//     options.url='bbr/tekniskeanlaeg';
//     options.qs= {};
//     options.qs.cache= 'no-cache';
//     options.qs.bygning_id= bygning.id;
//     options.resolveWithFullResponse= true;
//     response=  await rp(options);    
//     assert(response.statusCode===200, "Http status code != 200");
//     var tekniskeanlæg= JSON.parse(response.body);
//     assert(tekniskeanlæg.length===0, "Der er fundet " + tekniskeanlæg.length + 'tekniske anlæg'); 
//   });


// });

describe('Stednavne', function(){

  it("stednavnetyper", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavntyper';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavntyper= JSON.parse(response.body);
      assert(stednavntyper.length>10, "Der er fundet for få: "+stednavntyper.length);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("stednavnereverse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.x= 12.511274124050752;
    options.qs.y= 55.69826837488762;
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>=3, "Der er burde være mindst 3: "+stednavne.length);
      // stednavne.forEach(function(element) {
      //   console.log(element.navn);
      // });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });


  it("polygon", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.polygon= '[[[12.509943668963547, 55.69947895194342],[12.51370394018313, 55.69929935996996],[12.51175895655753, 55.69735533932972],[12.509943668963547, 55.69947895194342]]]';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>=3, "Der er burde være mindst 3: "+stednavne.length);
      // stednavne.forEach(function(element) {
      //   console.log(element.navn);
      // });

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.navn= 'Gudenå';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length===1, "Der er burde være en: "+stednavne.length);
      assert(stednavne[0].kommuner.length > 0, "Der burde være tilknyttet mindst en kommune ")
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("navnestatus", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.navn= 'Gudenå';
    options.qs.navnestatus= 'officielt';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length===0, "Der er burde ikke være nogen: "+stednavne.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("cirkel", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.cirkel= '12.509943668963547,55.69947895194342,20';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>=3, "Der er burde være mindst 3: "+stednavne.length);
      // stednavne.forEach(function(element) {
      //   console.log(element.navn);
      // });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("nærmeste", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.x= 9.323853;
    options.qs.y= 54.989794;
    options.qs.nærmeste= true;
    options.qs.undertype= 'mindesten';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length===1, "Der er burde kun være 1: "+stednavne.length);
      assert(stednavne[0].navn==='Urnehoved Tingsted', "Det er burde kun være Urnehoved Tingsted: "+stednavne[0].navn);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("hovedtypesøgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.hovedtype= 'Begravelsesplads';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>10, "Der er burde være mindst 10 begravelsespladser: "+stednavne.length);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("undertypesøgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.undertype= 'ø';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>10, "Der er burde være mindst 10 øer: "+stednavne.length);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });
});

describe('Stednavne2', function(){

  it("stednavnereverse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne2';
    options.qs= {};
    options.qs.x= 12.511274124050752;
    options.qs.y= 55.69826837488762;
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>=3, "Der er burde være mindst 3: "+stednavne.length);
      // stednavne.forEach(function(element) {
      //   console.log(element.navn);
      // });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });


  it("polygon", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne2';
    options.qs= {};
    options.qs.polygon= '[[[12.509943668963547, 55.69947895194342],[12.51370394018313, 55.69929935996996],[12.51175895655753, 55.69735533932972],[12.509943668963547, 55.69947895194342]]]';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>=3, "Der er burde være mindst 3: "+stednavne.length);
      // stednavne.forEach(function(element) {
      //   console.log(element.navn);
      // });

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne2';
    options.qs= {};
    options.qs.navn= 'Gudenå';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length===1, "Der er burde være en: "+stednavne.length);
      assert(stednavne[0].sted.kommuner.length > 0, "Der burde være tilknyttet mindst en kommune ")
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("navnestatus", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne2';
    options.qs= {};
    options.qs.navn= 'Gudenå';
    options.qs.navnestatus= 'officielt';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length===0, "Der er burde ikke være nogen: "+stednavne.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("cirkel", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne2';
    options.qs= {};
    options.qs.cirkel= '12.509943668963547,55.69947895194342,20';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>=3, "Der er burde være mindst 3: "+stednavne.length);
      // stednavne.forEach(function(element) {
      //   console.log(element.navn);
      // });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("nærmeste", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne2';
    options.qs= {};
    options.qs.x= 9.323853;
    options.qs.y= 54.989794;
    options.qs.nærmeste= true;
    options.qs.undertype= 'mindesten';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length===1, "Der er burde kun være 1: "+stednavne.length);
      assert(stednavne[0].navn==='Urnehoved Tingsted', "Det er burde kun være Urnehoved Tingsted: "+stednavne[0].navn);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("hovedtypesøgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne2';
    options.qs= {};
    options.qs.hovedtype= 'Begravelsesplads';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>10, "Der er burde være mindst 10 begravelsespladser: "+stednavne.length);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("undertypesøgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne2';
    options.qs= {};
    options.qs.undertype= 'ø';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>10, "Der er burde være mindst 10 øer: "+stednavne.length);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });


  it("adresser indeholdt i et stednavns geometri", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adresser';
    options.qs= {};
    options.qs.stednavnid= '564e1e26-3f8c-d458-e053-d480220a2d36';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length===1, "Der burde være en: "+stednavne.length);
      assert(stednavne[0].adressebetegnelse === 'Christian 8.s Vej 80, 8600 Silkeborg', "Burde være 'Christian 8.s Vej 80, 8600 Silkeborg'");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("adresser indeholdt i et stednavns geometri samt 200 meter derfra", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adresser';
    options.qs= {};
    options.qs.stednavnid= '1233766a-2e10-6b98-e053-d480220a5a3f';
    options.qs.stednavnafstand= 200;
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresser= JSON.parse(response.body);
      assert(adresser.length>3, "Der burde være mere end tre adresser: "+adresser.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  function gandhi(stednavn) {
    return stednavn.navn==='Gandhiparken';
  }

  it("stednavne fuzzy søgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='stednavne';
    options.qs= {};
    options.qs.q= 'gandi';
    options.qs.fuzzy= true;
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>10, "Der er burde være mindst 3: "+stednavne.length);
      assert(stednavne.find(gandhi), "Gandhiparken findes ikke");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });


});


describe('Steder', function(){

  it("stednavnereverse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='steder';
    options.qs= {};
    options.qs.x= 12.511274124050752;
    options.qs.y= 55.69826837488762;
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var steder= JSON.parse(response.body);
      assert(steder.length>=3, "Der er burde være mindst 3: "+steder.length);
      // steder.forEach(function(element) {
      //   console.log(element.primærtnavn);
      // });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });


  it("polygon", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='steder';
    options.qs= {};
    options.qs.polygon= '[[[12.509943668963547, 55.69947895194342],[12.51370394018313, 55.69929935996996],[12.51175895655753, 55.69735533932972],[12.509943668963547, 55.69947895194342]]]';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var steder= JSON.parse(response.body);
      assert(steder.length>=3, "Der er burde være mindst 3: "+steder.length);
      // steder.forEach(function(element) {
      //   console.log(element.primærtnavn);
      // });

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("primærtnavn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='steder';
    options.qs= {};
    options.qs.primærtnavn= 'Gudenå';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var steder= JSON.parse(response.body);
      assert(steder.length===1, "Der er burde være en: "+steder.length);
      assert(steder[0].kommuner.length > 0, "Der burde være tilknyttet mindst en kommune ")
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("primærnavnestatus", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='steder';
    options.qs= {};
    options.qs.primærnavnestatus= 'Gudenå';
    options.qs.navnestatus= 'officielt';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var steder= JSON.parse(response.body);
      assert(steder.length===0, "Der er burde ikke være nogen: "+steder.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("cirkel", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='steder';
    options.qs= {};
    options.qs.cirkel= '12.509943668963547,55.69947895194342,20';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var steder= JSON.parse(response.body);
      assert(steder.length>=3, "Der er burde være mindst 3: "+steder.length);
      // steder.forEach(function(element) {
      //   console.log(element.primærtnavn);
      // });
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("nærmeste", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='steder';
    options.qs= {};
    options.qs.x= 9.323853;
    options.qs.y= 54.989794;
    options.qs.nærmeste= true;
    options.qs.undertype= 'mindesten';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var steder= JSON.parse(response.body);
      assert(steder.length===1, "Der er burde kun være 1: "+steder.length);
      assert(steder[0].primærtnavn==='Urnehoved Tingsted', "Det er burde kun være Urnehoved Tingsted: "+steder[0].navn);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("hovedtypesøgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='steder';
    options.qs= {};
    options.qs.hovedtype= 'Begravelsesplads';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>10, "Der er burde være mindst 10 begravelsespladser: "+stednavne.length);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("undertypesøgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='steder';
    options.qs= {};
    options.qs.undertype= 'ø';
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var stednavne= JSON.parse(response.body);
      assert(stednavne.length>10, "Der er burde være mindst 10 øer: "+stednavne.length);

      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});

describe('Brofast', function(){

  it("ø", async () => {
    var options = {};
    options.baseUrl = host;
    options.url = 'steder';
    options.qs = {};
    options.qs.hovedtype = "Landskabsform";
    options.qs.undertype = "ø";
    options.qs.primærtnavn = "Sejerø";
    options.qs.cache = 'no-cache';
    options.json = true;
    const steder = await rp(options);
    assert(steder.length === 1, "Der er burde være 1: " + steder.length);
    assert(steder[0].egenskaber.brofast === false, "Sejerø burde ikke være brofast: " + steder[0].egenskaber.brofast);
  });

  it("adgangsadresse", async () => {
    var options= {};
    options.baseUrl= host;
    options.url='/adgangsadresser/0a3f5082-88a1-32b8-e044-0003ba298018';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.json= true;
    const adgangsadresse = await rp(options);
    assert(adgangsadresse.brofast===false, "En adgangsadresse på Sejerø burde ikke være brofast: "+adgangsadresse.brofast);
  });

  it("adresse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/adresser/0a3f50ac-9837-32b8-e044-0003ba298018';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adresse= JSON.parse(response.body);
      assert(adresse.adgangsadresse.brofast===false, "En adresse på Sejerø burde ikke være brofast: "+adresse.adgangsadresse.brofast);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});

describe('Bygninger', function(){

  it("id", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/bygninger';
    options.qs= {};
    options.qs.id= 1069948949;
    options.qs.cache= 'no-cache';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {

      assert(response.statusCode===200, "Http status code != 200");
      var bygninger= JSON.parse(response.body);
      assert(bygninger.length>=1, "Der er burde være en: "+bygninger.length);

      assert(bygninger[0].adgangsadresser.length > 3, "Der bør være mere end tre adgangsadresser tilknyttet bygningen, men der er "+bygninger[0].adgangsadresser.length)

      var bbroptions= {};
      bbroptions.url=bygninger[0].bbrbygning.href;
      bbroptions.qs= {};
      bbroptions.qs.cache= 'no-cache';
      bbroptions.resolveWithFullResponse= true;
      rp(bbroptions).then((response) => {
        assert(response.statusCode===200, "Http status code != 200");
        var bbrbygning= JSON.parse(response.body);
        assert(bygninger[0].bbrbygning.id === bbrbygning.Bygning_id, "id skal være den samme i bygning og bbrbygning");
        done();
      })

    })
    .catch((err) => {
      done(err);
    });
  });


  it("cirkel", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/bygninger';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.cirkel= "12.510814300000002,55.69837060000,50";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bygninger= JSON.parse(response.body);
      assert(bygninger.length > 2, "Ikke to bygninger, men "+bygninger.length);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("polygon", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/bygninger';
    options.qs= {};
    options.qs.cache= 'no-cache'; 
    options.qs.polygon= '[[[8.91172755486213, 56.59274886518194],[8.948437235894998, 56.57437007272818],[8.876752381627279, 56.579839531262145],[8.91172755486213, 56.59274886518194]]]';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bygninger= JSON.parse(response.body);
      assert(bygninger.length > 2, "Ikke flere end to bygninger, men bygninger.length");
      //console.log(navngivneveje[0].navn);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

   
  it("reverse", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/bygninger';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.x= 12.510814300000002;
    options.qs.y= 55.69837060000;
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bygninger= JSON.parse(response.body);
      assert(bygninger.length > 0, "ingen bygning");
      //console.log(bygninger[0].navn);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});


describe('Vejnavnpostnummerrelation', function() {



  it("Søgning", async function () {
    let options = {};
    options.baseUrl = host;
    options.url = 'vejnavnpostnummerrelationer';
    options.qs = {};
    options.qs.cache = 'no-cache';
    options.qs.vejnavn = "Holbækmotorvejen";
    options.resolveWithFullResponse = true;
    let response = await rp(options);
    assert(response.statusCode === 200, "Http status code != 200");
    let vejnavnpostnummerrelationer = JSON.parse(response.body);
    assert(vejnavnpostnummerrelationer.length === 10, "Der er ikke fundet én, men  " + vejnavnpostnummerrelationer.length);
  });

  it("Søgning med kommunekode", async function () {
    let options = {};
    options.baseUrl = host;
    options.url = 'vejnavnpostnummerrelationer';
    options.qs = {};
    options.qs.cache = 'no-cache';
    options.qs.q = "slesv*";
    options.qs.kommunekode = "0101";
    options.resolveWithFullResponse = true;
    let response = await rp(options);
    assert(response.statusCode === 200, "Http status code != 200");
    let vejnavnpostnummerrelationer = JSON.parse(response.body);
    assert(vejnavnpostnummerrelationer.length === 1, "Der er ikke fundet én, men  " + vejnavnpostnummerrelationer.length);
  });

  it("Opslag", async function () {
    let options = {};
    options.baseUrl = host;
    options.url = 'vejnavnpostnummerrelationer/2605/Holbækmotorvejen';
    options.qs = {};
    options.qs.cache = 'no-cache';
    options.resolveWithFullResponse = true;
    let response = await rp(options);
    assert(response.statusCode === 200, "Http status code != 200");
    let vejnavnpostnummerrelation = JSON.parse(response.body);
    assert(vejnavnpostnummerrelation.kommuner.length === 1, "Der er ikke fundet en kommuner, men  " + vejnavnpostnummerrelation.kommuner.length);
  });

  it("Autocomplete", async function () {
    let options = {};
    options.baseUrl = host;
    options.url = 'vejnavnpostnummerrelationer/autocomplete';
    options.qs = {};
    options.qs.cache = 'no-cache';
    options.qs.q = "Holbækm";
    options.resolveWithFullResponse = true;
    let response = await rp(options);
    assert(response.statusCode === 200, "Http status code != 200");
    let vejnavnpostnummerrelationer = JSON.parse(response.body);
    assert(vejnavnpostnummerrelationer.length === 10, "Der er ikke fundet én, men  " + vejnavnpostnummerrelationer.length);
  });

});


