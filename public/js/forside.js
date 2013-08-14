function search(input,kommune) {
	var update;
	var vejnavn= null;
	//var fremadtast
	$(input).keyup(function(event) {
		//fremadtast= (event.which !== 8);
		console.log("#q: %s, vejnavn: %s", $(input).val(), vejnavn);
		if (vejnavn) {
			vejnavn= ($(input).val().length >= vejnavn.length)?vejnavn:null;
		}
	});
	$(input).typeahead({
		items: 12,
		source: function (query, process) {
			var parametre= {q: query}; 
			if (vejnavn) parametre.vejnavn= vejnavn;
			if (kommune) parametre.kommune= kommune;
			update= process; 
      // var starttime= Date.now();    // start på udelukkelse af gamle forspørgelser  
			$.ajax({
				cache: true,
			  url:'adresser/fritekst.json',
				data: parametre,
			  dataType: "json",
			  error: function (xhr, status, errorThrown) {	
  				var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
  				alert(text);
				} ,
				success: function (adresser) {
					var items= [];
					$.each(adresser, function (i, adresse) {
						items.push(adresse.vej.navn + (adresse.husnr.length > 0?' '+adresse.husnr:"") + (adresse.etage.length > 0?', '+adresse.etage+'.':"") + (adresse.dør.length > 0?' '+adresse.dør:"") + (adresse.postnummer.nr.length > 0?' - '+adresse.postnummer.nr+' '+adresse.postnummer.navn:""));
					});
		    	if (items[0]) {
		    		var qs= $(input).val();
			    	var l= qs.length;
			    	// if (qs.charAt(l-1) !== items[0].charAt(l-1)) {
			    	// 	l= l+1;
			    	// }
			    	var s= items[0].substring(0,l);
			    	console.log('qs: '+qs+', s: '+s);
			    	if (qs.toLocaleLowerCase() === s.toLocaleLowerCase()) $(input).val(s);
		    	}
					process(items);
				}
			});
    },
    updater: function (item) {
    	if (vejnavn===null) vejnavn= item;
    	this.source(item,update);
    	return item;
    },
    sorter: function (items) {
    	var s= $(input).val();
    	if (vejnavn===null && items.length===1 && s.length === items[0].length) {
    		// $(input).val(items[0]);
    		vejnavn= items[0];
    		this.source(items[0],update);
    	}
    	return items;
    },
    matcher: function (item) {
    	return true;
    }
	});
}

function inverseGeocoding()
{
	var map;
  var marker;

  function onMapClick(e) {
    // marker= L.marker(e.latlng).addTo(map);
    // marker.bindPopup(e.latlng.toString()).openPopup();
    var url = "/adresser/" + e.latlng.lat.toString() + "," + e.latlng.lng.toString() + ".json";
    $.ajax({
      url: url,
      dataType: "jsonp",
      success: function(data) {          
        var popup = L.popup();
        popup
          .setLatLng(new L.LatLng(data.adressepunkt.wgs84koordinat.bredde,data.adressepunkt.wgs84koordinat.længde))
          .setContent((data.bygningsnavn.length > 0?data.bygningsnavn + "<br>":"") +
                      data.vej.navn + " " + data.husnr + "<br>" + 
                      (data.supplerendebynavn.length > 0?data.supplerendebynavn + "<br>":"") +
                      data.postnummer.nr + " " + data.postnummer.navn )
          .openOn(map);
      }
    });
 	}

  map = L.map('map');
  var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var osmAttrib='Map data &copy; OpenStreetMap contributors';
  var osm = new L.TileLayer(osmUrl, {maxZoom: 18, attribution: osmAttrib}); 
  map.setView(new L.LatLng(55.0014602722233, 14.9985934015052),16);
  map.addLayer(osm);
  //marker= L.marker([55.6983973833368, 12.510857247459]).addTo(map);
  //marker.bindPopup("<b>Rødkildevej 46</b><br>2400 København NV").openPopup();
  //var bounds= L.LatLngBounds( <LatLng[]> latlngs );
  //map.fitBounds( <LatLngBounds> bounds, <fitBounds options> options? );
  // http://leafletjs.com/reference.html#map-fitbounds

  map.on('click', onMapClick);
}

$(function () {
	search('#q',null);
	search('#qk','0101');
	inverseGeocoding();
});