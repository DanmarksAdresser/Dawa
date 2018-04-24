$.widget("dawa.dawaautocomplete", {
	options: {
		jsonp: !("withCredentials" in (new XMLHttpRequest())),
		baseUrl: 'https://dawa.aws.dk',
		minLength: 2,
		delay: 0,
		adgangsadresserOnly: false,
		autoFocus: true,
		timeout: 10000,
		error: null,
		params: {},
		fuzzy: true,
		stormodtagerpostnumre: true
	},

	_create: function () {
		var element = this.element;
		var options = this.options;
		var targetType =  options.adgangsadresserOnly ? 'adgangsadresse' : 'adresse';
		var autocompleteWidget = this;
		var caretpos = null;
		var adgangsadresseid = null;
		var skipVejnavn = false;

		var cache = {};

		// perform a GET request to DAWA autocomplete, caching the response
		function get(params, cb) {
			var stringifiedParams = JSON.stringify(params);
			if (cache[stringifiedParams]) {
				return cb(cache[stringifiedParams]);
			}
			$.ajax({
				url: options.baseUrl + '/autocomplete',
				dataType: options.jsonp ? "jsonp" : "json",
				data: $.extend({}, params, options.params),
				timeout: options.timeout,
				success: function (data) {
					cache[stringifiedParams] = data;
					cb(data);
				},
				error: options.error
			});
		}

		function stormodtagerAdresseTekst(data) {
			var adresse = data.vejnavn;
			if(data.husnr) {
				adresse += ' ' + data.husnr;
			}
			if(data.etage || data.dør) {
				adresse += ',';
			}
			if(data.etage) {
				adresse += ' ' + data.etage + '.';
			}
			if(data.dør) {
				adresse += ' ' + data.dør;
			}
			adresse += ', ';
			if(data.supplerendebynavn) {
				adresse += data.supplerendebynavn + ', ';
			}
			adresse += data.stormodtagerpostnr + ' ' + data.stormodtagerpostnrnavn;
			return adresse;
		}

		function getAutocompleteResponse(type, q, currentCaretPos, cb) {
			var params = {q: q, type: type, caretpos: currentCaretPos};
			if(options.fuzzy) {
				params.fuzzy = '';
			}
			if(adgangsadresseid) {
				params.adgangsadresseid = adgangsadresseid;
			}
			if(skipVejnavn) {
				params.startfra = 'adgangsadresse';
			}
			skipVejnavn = false;

			var adgangsadresseRestricted = !!adgangsadresseid;

			// Vi begrænser kun til en bestemt adgangsadresseid én gang
			adgangsadresseid = null;

			get(params, function(result) {
				var processedResult = result.reduce(function(memo, row) {
					if((row.type === 'adgangsadresse' || row.type === 'adresse') && row.data.stormodtagerpostnr) {
						// Vi har modtaget et stormodtagerpostnr. Her vil vi muligvis gerne vise stormodtagerpostnummeret
						var stormodtagerEntry = jQuery.extend({}, row);
						stormodtagerEntry.tekst = stormodtagerAdresseTekst(row.data);
						stormodtagerEntry.forslagstekst = stormodtagerEntry.tekst;

						var rows = [];
						// Omvendt, hvis brugeren har indtastet den almindelige adresse eksakt, så er der ingen
						// grund til at vise stormodtagerudgaven
						if(q !== stormodtagerEntry.tekst) {
							rows.push(row);
						}

						// Hvis brugeren har indtastet stormodtagerudgaven af adressen eksakt, så viser vi
						// ikke den almindelige udgave
						if(q !== row.tekst) {
							rows.push(stormodtagerEntry);
						}

						// brugeren har indtastet stormodtagerpostnummeret, såvi viser stormodtager udgaven først.
						if(rows.length > 1 && q.indexOf(row.data.stormodtagerpostnr) !== -1) {
							rows = [rows[1], rows[0]];
						}
						memo = memo.concat(rows);
					}
					else {
						memo.push(row);
					}
					return memo;
				}, []);
				if(adgangsadresseRestricted && processedResult.length === 1) {
					// der er kun en adresse på adgangsadressen
					element.val(processedResult[0].tekst);
					element.selectionStart = caretpos = processedResult[0].caretpos;
					element.autocomplete('close');
					autocompleteWidget._trigger('select', null, processedResult[0]);
				}
				else {
					cb(processedResult);
				}
			});
		}

		var autocompleteOptions = $.extend({}, options, {
			source: function (request, response) {
				var q = request.term;
				caretpos = element[0].selectionStart;
				return getAutocompleteResponse(targetType, q, caretpos, response);
			},
			select: function (event, ui) {
				event.preventDefault();
				var item = ui.item;
				element.val(item.tekst);
				element[0].selectionStart = element[0].selectionEnd = caretpos = item.caretpos;
				if(item.type !== targetType) {
					if(item.type === 'adgangsadresse') {
						adgangsadresseid = item.data.id;
					}
					if(item.type === 'vejnavn') {
						skipVejnavn = true;
					}
					setTimeout(function () {
						element.autocomplete('search');
					});
				}
				else {
					element.autocomplete('close');
					autocompleteWidget._trigger('select', null, item);
				}
			}
		});
		element.autocomplete(autocompleteOptions).data("ui-autocomplete")._renderItem = function (ul, item) {
			return $("<li></li>")
				.append(item.forslagstekst)
				.appendTo(ul);
		};
		element.on("autocompletefocus", function (event) {
			event.preventDefault();
		});
		// der er tilsyneladende ingen skudsikker måde at få en event når
		// caret positionen ændrer sig, så vi benytter en timer i stedet.
		setInterval(function() {
			var currentCaretpos = element[0].selectionStart;
			if(element[0] === document.activeElement && caretpos !== currentCaretpos) {
				caretpos = currentCaretpos;
				element.autocomplete('search');
			}
		}, 100);
	}
});
