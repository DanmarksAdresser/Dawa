# DAR-DAWA katalog
Følgende er en liste over uhensigtsmæssigheder ved konvertering 
af DAR datamodellen til DAWA-datamodellen.

## Terminologi afviger markant
Terminologien i DAR er markant anderledes, hvilket uundgåeligt vil
skabe nogen forvirring:
 * Adgangsadresse er omdøbt til Husnummer
 * Vejstykke er omdøbt til NavngivenVejKommunedel
 * Statuskoder er anderledes
 
Løsningsforslag:
 * Vi udvider dokumentationen med information om terminologiændringerne
 * For nye entiteter anvendes tekststrenge i stedet for statuskoder
 
## Supplerende bynavne i DAR er rigtige entiter med ID
I DAWA-modellen er supplerende bynavne basalt set bare en streng.
 
 * supplerendebynavn-property i adgangsadresser burde fremover være et objekt med href
 * /supplerendebynavne burde udstille supplerendebynavn-objekter
 * /supplerendebynavne/<id> burde returnere et supplerende bynavn

Løsningforslag:
 * Udstil supplerende bynavne på en ny ressource /supplerendebynavne2
 

## NavngivenVejKommunedel (vejstykker) har fået en rigtig ID

P.t. er hrefs til vejstykker angivet med kommunekode og vejkode
href til et vejstykke burde i stedet anvende vejstykkets id.

Løsningsforslag:
* links til vejstykker bevares som de er.

## Adgangspunkt og Vejpunkt
I DAR er adgangspunkt og vejpunkt samme type. Det ville være
godt hvis det også var tilfældet i DAWA.

Løsningsforslag:
 * Vejpunkt får samme felter som adgangspunkt

## NavngivenVejKommunedel har fået status-felt
Det åbner for spørgsmålet, hvilke skal udstilles på DAWA?

Løsningsforslag:
 * Gældende og foreløbige udstilles, ligesom på adgangsadresser

## NavngivenVejKommunedel har igen meningsfyldt oprettet/ændret timestamps
Idet der nu er en bitemporal datamodel for NavngivenVejKommunedel,
så kan vi nu igen beregne oprettet/ændret tidspunkter for entiteten. 

Løsningsforslag:
 * oprettet og ændret udfyldes ud fra DAR-historikken, men ændringen udløser ikke
 hændelser på hændelses-API'et.

## Nestede objekter til adgangspunkt og vejpunkt
Selvom vi returnerer JSON, så burde adgangspunkt og vejpunkt-properties
måske være GeoJSON features.

## Udstilling af adgangsadresser i GeoJSON format
Adgangsadresser har nu både et adgangspunkt og et vejpunkt. Det åbner for
spørgsmålet hvordan vi udstiller dem i GeoJSON format. Der er forskellige muligheder:

 * Man angiver, ved en queryparameter, om den returnerede geometri
 skal være adgangspunktet eller vejpunktet. Spatiale filtreringer virker på det man har angivet. Den "anden" geometri 
 returneres som property (I GeoJSON format, hvis man har valgt "struktureret" ellers i flade felter)
 * Den returnerede geometri er fortsat adgangspunktet, og vejpunktet returneres som property 
 (der evt. kan være en geojson feature)
 
## DAGI temaer med uuid
Alle DAGI-temaer får nu UUID. Vi burde udstille dette UUID.
 
# Andre ideer til ny version af API

## Konsistent feltnavngivning
Vi udstiller de fleste entiteter i både et fladt og et nestet format.
Det ville være godt, hvis der var en entydig og konsistent måde at mappe en nestet struktur til en flad struktur.
F.eks. hvis en nestet struktur har et objekt "kommune" der har en property "kode", så hedder feltet i den
flade struktur altid "kommune_kode". Det ville mindske mængden af kode betydeligt.

## Mulighed for at angive hvilke felter der ønskes
Det ville være fint hvis man kunne angive præcis hvilke felter man ønsker at hente. Hvis man f.eks.
kun ønsker id, kommunekode, vejkode, husnr og postnr i et CSV-udtræk, så kunne man simpelthen
angive den liste af felter. Det ville også give en stor performanceforbedring (men til gengæld lidt mindre caching).

## Legacy ejerlavkode og matrikelnr
Vores datamodel indeholder legacy ejerlavkode og matrikelnr som vi i sin tid modtog fra BBR.
Disse opdateres ikke længere, i stedet beregnes de ud fra adressens geografiske placering på matrikelkortet.

Løsningsforslag:

 * Legacy ejerlavkode og matrikelnr felter udgår.

## Fremtidige ændringer
I DAR 1.0 kan der være registreret ændringer til en adresse, som sker i fremtiden. Det kan aktuelt kun
angives som dato (dvs. der sker ikke ændringer i løbet af en dag).

#### Løsningsforslag:
 Vi arbejder med en lokal virkningstid i databasen. Med jævnlige intervaller (~ 1 minut, eksempelvis)
 fremskriver vi den lokale virkningstid og udfører de ændringer som er registreret i perioden siden 
 forrige virkningstid. Denne fremskrivning sker også ved indlæsning af hændelser - her fremskrives 
 den lokale virkningstid til registreringstidspunktet for den transaktion vi indlæser.
 
 Derudover kan det overvejes, om ikrafttrædelsesdatoen for en adresse skal udstilles i DAWA. Man
 kunne i princippet godt finde den dato hvor adressen i fremtiden skifter fra foreløbig til gældende
 og udstille denne adresse som et felt.
 
 DAR-entiteter med status 1 (intern brug) udstilles ikke på DAWA. 
 

# Ting som kan rummes i DAWA-modellen uden væsentlige problemer
Følgende er en liste over ting som godt kan rummes i den eksisterende datamodel
uden de store vanskeligheder, og vi kan derfor overveje at tage dem med fra starten:

 * ID for adgangspunkt
 * ID for vejstykker
 * Status for vejstykker
 * NavngivenVej kan udstilles som ny Entitet
 * NavngivenVej property på Adgangsadresser

