# Tabeller i DAWA
Alle DAWA data er gemt i en PostgreSQL database. Data er fordelt på over 350 tabeller, 
der understøtter DAWAs funktionalitet. Der er godt 300GB data inklusive indexes.

Tabellerne kan grundlæggende opdeles i følgende hovedgrupper:

 - Kildetabeller: indeholder data indlæst fra datakilden. Data er struktureret på den måde, som kilden leverer data.
 - Afledte tabeller: indeholder data, som er beregnet ud fra andre tabeller.
 - Metadatatabeller: indeholder forskellige metadata bl.a. til brug for replikerings-API'et
 - :Historiske tabeller: er tabeller som ikke længere opdateres, men hvor vi har historiske 
 data til brug for DAWAs datavask-funktionalitet.
 
De fleste tabeller i DAWA har en tilknyttet hændelsestabel, som indeholder historikken for den pågældende tabel. Formålet med hændelsestabellerne
er dels at understøtte replikerings-API'et, og dels at facilitere inkrementiel opdatering af data uden
at genberegne hele tabeller.

## Kildetabeller
Kildetabellerne er grupperet ud fra datakilden.

### DAR
Følgende tabeller indeholder kildedataene fra DAR:
 - dar1_adresse
 - dar1_adressepunkt
 - dar1_darafstemningsområde
 - dar1_darkommuneinddeling
 - dar1_darmenighedsrådsafstemningsområde
 - dar1_darsogneinddeling
 - dar1_husnummer
 - dar1_navngivenvej
 - dar1_navngivenvejkommunedel
 - dar1_navngivenvejpostnummerrelation
 - dar1_navngivenvejsupplerendebynavnrelation
 - dar1_postnummer
 - dar1_reserveretvejnavn
 - dar1_supplerendebynavn

Disse tabeller er alle bitemoporale, og hver række indeholder registrerings- og virkningsinterval.

 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Nær-realtid, baseret på DARs API.

### DAGI
Følgende tabeller indeholder kildedataene fra DAGI:

 - kommuner
 - landsdele
 - regioner
 - afstemningsomraader
 - opstillingskredse
 - politikredse
 - retskredse
 - sogne
 - menighedsraadsafstemningsomraader
 - dagi_postnumre
 - dagi_supplerendebynavne

Storkredse og valglandsdele beregnes af DAWA, da de ikke udstilles på datafordeleren. Disse tabeller fremgår under afsnittet "afledte tabeller".

Tabellerne indeholder ikke blot kildedata, men også afledte data (bounding box, visuelt center samt søgevektor)

 - Hændelsestabel: Ja
 - Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig
### Zonekortet
Zonekortet gemmes i tabellen zoner.  

 - Hændelsestabel: Ja
 - Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

### Højder
Tabellen "højder" indeholder husnumrenes højdekote (z-koordinat). Tabellen beregnes ud fra 
Danmarks højdemodel, og opdateres via kortforsyningens webservice hver gang et husnummer oprettes eller adressepunktet ændres.

 - Hændelsestabel: Ja
 - Replikerings-API: Ja
 - Odpateringsfrekvens: Nær-realtid

### Stormodtagere
Tabellen "stormodtagere" indeholder såkaldt stormodagerpostnumre. Vedligeholdes manuelt baseret på oplysninger fra PostNord.

 - Hændelsestabel: Ja
 - Replikerings-API: Ja
 - Opdateringsfrekvens: Manuel efter behov

### Vejmidter
Tabellen "vejmidter" indeholder vejstykkernes geometri. Data leveres til os via FTP.

 - Hændelsestabel: Ja
 - Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

### Matrikelkortet
Matrikelkortet gemmes i følgende tabeller:
 - matrikel_jordstykker
 - ejerlav
 
 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

### stednavne
Stednavne gemmes i følgende tabeller:
 - steder
 - stednavne
 
 For steder beriges data med en bounding box samt visuelt center.
 
  - Hændelsestabel: Ja
 - Replikerings-API: Ja
  - Opdateringsfrekvens: Daglig

### Bygningspolygoner
Bygningspolygoner gemmes i tabellen "bygninger". Vi beriger ved indlæsning med bounding box samt visuelt center.

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

### Brofasthed
Tabellen brofasthed indeholder oplysninger om danske øers brofasthed. Data er udarbejdet specifikt til DAWA og ikke
udstillet andre steder. Vedligeholdes manuelt.

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Manuelt efter behov

### BBR (legacy)
Følgende tabeller indeholder tilbagekonverterede BBR data:
 - ois_bygning
 - ois_bygningspunkt
 - ois_datatype
 - ois_ejerskab
 - ois_enhed
 - ois_enhedenhedsadresse
 - ois_enhedopgang
 - ois_entitet
 - ois_etage
 - ois_felt
 - ois_grund
 - ois_kode
 - ois_kodefelt
 - ois_kodetype
 - ois_kommune
 - ois_matrikelreference
 - ois_opgang
 - ois_tekniskanlaeg

Tabellerne importeres fra OIS og strukturen svarer nøje til OIS tabellerne.

 - Hændelsestabel: Nej
- Replikerings-API: Nej
 - Opdateringsfrekvens: Daglig

### BBR (Grunddata)
Følgende tabeller indeholder BBR grunddatamodellen:

 - bbr_bygning
 - bbr_bygningpåfremmedgrund
 - bbr_ejendomsrelation
 - bbr_enhed
 - bbr_enhedejerlejlighed
 - bbr_etage
 - bbr_fordelingaffordelingsareal
 - bbr_fordelingsareal
 - bbr_grund
 - bbr_grundjordstykke
 - bbr_opgang
 - bbr_tekniskanlæg

Tabellerne importeres fra OIS og strukturen svarer nøje til OIS tabellerne. Tabellerne er bitemporale
og indeholder registrerings- og virkningsinterval.

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

## Afledte tabeller
DAWA indeholder et stort antal afledte tabeller. Indeholdet af disse
tabeller beregnes ud fra andre tabeller, det kan både være kildetabeller eller andre afledte tabeller.

Hver afledt tabel har et tilknyttet SQL VIEW, som beskriver hvordan den afledte tabel beregnes ud fra andre tabeller. En central
del af DAWA er den beregningsmotor, som kan opdatere de afledte tabeller inkrementielt i korrekt rækkefølge ud fra hændelsestabeller.

Nogle af de afledte tabeller indeholder data, som beregnes af DAWA. Andre tabeller
indeholder denormaliserede data, som er nødvendige for at understøtte DAWAs opslags-API med tilstrækkeligt god
performance.

Nendenstående er en gennemgang af de afledte tabeller i DAWA.

### Afledte DAGI temaer
DAWA beregner nogle DAGI temaer, som ikke stammer fra kilden men som afledes ud fra andre DAGI temaer.
Det drejer sig om tabellerne:

 - storkredse
 - valglandsdele
 - landpostnumre

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

### Opdelte geometrier
PostgreSQL er ikke i stand til effektivt at indeksere store geometrier. Derfor skal større geometrier opdeles
i mindre geometrier for at understøtte effektiv geokodning. Følgende tabeller indeholder opdelte geometrier:

 - afstemningsomraader_divided
 - dagi_postnumre_divided
 - dagi_supplerendebynavne_divided
 - kommuner_divided
 - landpostnumre_divided
 - landsdele_divided
 - menighedsraadsafstemningsomraader_divided
 - opstillingskredse_divided
 - politikredse_divided
 - regioner_divided
 - retskredse_divided
 - sogne_divided
 - steder_divided
 - stednavne_divided
 - storkredse_divided
 - valglandsdele_divided
 - zoner_divided

 - Hændelsestabel: Nej
- Replikerings-API: Nej
 - Opdateringsfrekvens: Daglig

### Virkningshistorikker
DAWA beregner virkningshistorik ud fra de bitemporale kildetabeller. Det gælder
 for både DAR samt BBR. Følgende tabeller indeholder virkningshistorik:
 
 - bbr_bygning_history
 - bbr_bygningpåfremmedgrund_history
 - bbr_ejendomsrelation_history
 - bbr_enhed_history
 - bbr_enhedejerlejlighed_history
 - bbr_etage_history
 - bbr_fordelingaffordelingsareal_history
 - bbr_fordelingsareal_history
 - bbr_grund_history
 - bbr_grundjordstykke_history
 - bbr_opgang_history
 - bbr_tekniskanlæg_history
 - dar1_adresse_history
 - dar1_adressepunkt_history
 - dar1_darafstemningsområde_history
 - dar1_darkommuneinddeling_history
 - dar1_darmenighedsrådsafstemningsområde_history
 - dar1_darsogneinddeling_history
 - dar1_husnummer_history
 - dar1_navngivenvej_history
 - dar1_navngivenvejkommunedel_history
 - dar1_navngivenvejpostnummerrelation_history
 - dar1_navngivenvejsupplerendebynavnrelation_history
 - dar1_postnummer_history
 - dar1_reserveretvejnavn_history
 - dar1_supplerendebynavn_history
 
 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Som kildebel (BBR opdateres daglig, DAR opdateres nær-realtid)
 
### Gældende tabeller
DAWA beregner tabeller, som indeholder de gældende rækker ud fra virkningshistorik. Det drejer

 - bbr_bygning_current
 - bbr_bygningpåfremmedgrund_current
 - bbr_ejendomsrelation_current
 - bbr_enhed_current
 - bbr_enhedejerlejlighed_current
 - bbr_etage_current
 - bbr_fordelingaffordelingsareal_current
 - bbr_fordelingsareal_current
 - bbr_grund_current
 - bbr_grundjordstykke_current
 - bbr_opgang_current
 - bbr_tekniskanlæg_current
 - dar1_adresse_current
 - dar1_adressepunkt_current
 - dar1_darafstemningsområde_current
 - dar1_darkommuneinddeling_current
 - dar1_darmenighedsrådsafstemningsområde_current
 - dar1_darsogneinddeling_current
 - dar1_husnummer_current
 - dar1_navngivenvej_current
 - dar1_navngivenvejkommunedel_current
 - dar1_navngivenvejpostnummerrelation_current
 - dar1_navngivenvejsupplerendebynavnrelation_current
 - dar1_postnummer_current
 - dar1_reserveretvejnavn_current
 - dar1_supplerendebynavn_current

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Som kildebel (BBR opdateres daglig, DAR opdateres nær-realtid)

### Tilknytninger
DAWA beregner husnumrenes geometriske tilknytning til andre objekter, dvs. DAGI temaer, steder, bygninger, jordstykker. Følgende tabeller indeholder
beregnede tilknytninger:

 - afstemningsomraadetilknytninger
 - bygningtilknytninger
 - kommunetilknytninger
 - landsdelstilknytninger
 - menighedsraadsafstemningsomraadetilknytninger
 - opstillingskredstilknytninger
 - politikredstilknytninger
 - postnummertilknytninger
 - regionstilknytninger
 - retskredstilknytninger
 - sognetilknytninger
 - stedtilknytninger
 - storkredstilknytninger
 - supplerendebynavntilknytninger
 - tilknytninger_mat
 - valglandsdelstilknytninger
 - zonetilknytninger
 - jordstykker_adgadr
 
 Tabellerne beregnes ud fra husnummerets adgangspunkt samt det relaterede objekts geometri.

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Nær-realid ved ændring af adressepunktet, ellers daglig.

### Geometriske relationer
DAWA beregner geometriske relationer mellem nogle objekter:

 - bygning_kommune: Indeholder relationen mellem bygning og komnmune
 - 

### jordstykker
DAWA beregner tabellen "jordstykker" ved at sammenstille jordstykker fra matriklen med data fra BBR. 
ESR Ejendomsnummer samt BFE nummer kommer fra BBR, resten kommer fra matriklen.

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

### navngivenvejkommunedel_postnr_mat
Tabellen indeholder relationen mellem NavngivenVejKommunedel og Postnummer. Tabellen
beregnes ud fra husnumrene samt ved at skære vejmidten med postnummerets geometri.

Tabellen er en intern tabel, og benyttes til beregning af andre afledte tabeller.

 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Daglig

### vejstykkerpostnumremat
Tabellen indeholder relationen mellem vejstykker og postnumre, men er derudover også beriget
med søgetekst.

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

### vejnavnpostnummmerrelation
Tabellen indeholder relationen vejnavne og postnumre, og udgør grundlaget for vejnavnpostnummerrelation API'et.

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Daglig

### tilknytninger_mat
Tabellen er en sammenstilling af de enkelte tilknytningstabeller, og benyttes
til at understøtte adresse-API'erne uden at skulle JOINe alle de enkelte tilknytningstabeller.

 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Delvis nær-realtid

### adgangsadresser_mat
Tabellen udgør grundlaget for adgangsadresse-API'et, og er en sammenstilling af følgende tabeller:

 - dar1_husnummer_current
 - dar1_darkommuneinddeling_current
 - dar1_navngivenvej_current
 - dar1_navngivenvejkommunedel_current
 - dar1_postnummer_current
 - dar1_supplerendebynavn_current
 - dar1_adressepunkt_current
 - dar1_darsogneinddeling_current
 - dar1_darafstemningsområde_current
 - dar1_darmenighedsrådsafstemningsområde_current
 - dar1_adressepunkt_current
 - stormodtagere
 - hoejder 

Tabellen er endvidere beriget med oprettelses-, opdaterings-,
 ikrafttrædelses- og nedlæggelsesdato, som beregnes af DAWA ud fra virkningshistorik-tabellerne.

 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Nær-realtid

### adresser_mat
Tabellen udgør grundlaget for adresse-API'et, og er sammenstillet af tabellerne adgangsadresser_mat samt dar1_adresse_current tabellerne.
 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Nær-realtid

### navngivenvejkommunedel_mat
Tabellen udgør grundlaget for vejstykke-API'et, og er sammenstillet af følgende tabeller:
 - dar1_navngivenvejkommunedel_current
 - dar1_navngivenvej_current
 - vejmidter

 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Nær-realtid

### Datavask-tabeller
Følgende tabeller udgør grundlaget for DAWAs datavask- og historik-API:

 - vask_adgangsadresser
 - vask_adresser
 - vask_postnumre
 - vask_vejnavn
 - vask_vejstykker_postnumre
 - vask_adgangsadresser_unikke
 - vask_adresser_unikke

 
Tabellerne beregnes ud fra DAR data samt historiske tabeller (beskrevet nedenfor)

 - Hændelsestabel: Ja
- Replikerings-API: kun vask_adresser og vask_adgangsadresser
 - Opdateringsfrekvens: Daglig

### ikke_brofaste_adresser
Indeholder oplysninger om adressers brofasthed. Beregnes ud fra tabellerne stedtilknytninger samt brofasthed.

 - Hændelsestabel: Ja
- Replikerings-API: Ja
 - Opdateringsfrekvens: Delvist realtid

### navngivenvej_mat
Grundlaget for navngivenvej-API'et. Beregnes ud fra dar1_navngivenvej_current. 
 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Realtid

### navngivenvejpostnummerrelation
Indeholder relationen mellem navngivenvej og postnummer. Beregnes ud fra vejens og postnumerets geografi.
 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Daglig

### postnumre_kommunekoder_mat
Indeholder relationen mellem postnumre og kommuner. Beregnes ud fra DAR adresser. Bruges til at understtte
kommune- og postnummer API'erne.

 - Hændelsestabel: Ja
- Replikerings-API: Nej
 - Opdateringsfrekvens: Daglig

## Historiske tabeller
De historiske tabeller indeholder data, som benyttes som grundlag for DARs datavask-tabeller, men som ikke opdateres længere.
Historikken fra DAR 0.9 er gemt i følgende tabeller:

 - dar_adgangspunkt
 - dar_adresse
 - dar_husnummer
 - dar_lastfetched
 - dar_postnr
 - dar_supplerendebynavn
 - dar_transaction
 - dar_vejnavn

CPRs vejregister er gemt i tabllen "cpr_vej".

 - Hændelsestabel: Nej
- Replikerings-API: Nej
 - Opdateringsfrekvens: Opdateres ikke

## Metadata-tabeller
Metadatatabeller indeholder ikke domænedata, men forskellige metadata, som
understøtter DAWA funktionalitet.

 - blobref: Indeholder referencer til S3 for store geometrier på replikerings-API'et
 - current_tx: indeholder aktuel transaktions-id
 - dar1_meta: Indeholder seneste event-id fra DAR
 - ejerlav_ts: Indeholder tidsstempler for opdatering af ejerlav fra kilden, benyttes af matrikelimporteren.
 - ois_importlog: Holder styr på hvilke filer der er importeret fra OIS
 - hoejde_importer_afventer: Indeholder de husnumre, som skal have opdateret hoejden
 - hoejde_importer_disabled: Indeholder de husnumre, hvor hoejdeopslag er fejlet
 - hoejde_importer_resultater: Indeholder resultat af API-opslag til hoejdeservicen.
 - transaction_history: Hændelser til brug for replikerings-API'et
 - transactions: Tisstempel og beskrivelse for gennemfoerte transaktioner
 - tx_operation_counts: Antal ændringer udfrt af transaktioner


## Legacy tabeller
Legacy-tabeller benyttes til at understtte forældrede entiteter replikerings-API'et. Det drejer sig om tabellerne:

 - adgangsadresser
 - enhedsadresser
 - navngivenvej
 - vejstykker
 - vejpunkter
 
 Tabellerne vedligeholdes udelukkende med det formål at understøtte replikerings-API'et.
 - Hændelsestabel: Ja
 - Replikerings-API: Ja
  - Opdateringsfrekvens: Realtid

