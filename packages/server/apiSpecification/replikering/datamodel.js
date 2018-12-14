const assert = require('assert');

const definitions = require('../commonSchemaDefinitions');
const temaModels = require('../../dagiImport/temaModels');
const schemaUtil = require('../../apiSpecification/schemaUtil');
const darReplikeringModels = require('../../dar10/replikeringModels');

const { defaultSchemas } = require('./datamodelUtil');
module.exports = {
  adgangsadresse: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'uuid',
        description: 'Universel, unik identifikation af adressen af datatypen UUID. ' +
        'Er stabil over hele adressens levetid (ligesom et CPR-nummer) ' +
        'dvs. uanset om adressen evt. ændrer vejnavn, husnummer, postnummer eller kommunekode. ' +
        'Repræsenteret som 32 hexadecimale tegn. Eksempel: ”0a3f507a-93e7-32b8-e044-0003ba298018”.'
      },
      {
        name: 'status',
        type: 'integer',
        schema: definitions.Status,
        description: 'Adgangsadressens status. 1 indikerer en gældende adresse, 3 indikerer en foreløbig adresse.',
      },
      {
        name: 'oprettet',
        type: 'localdatetime',
        nullable: true,
        description: 'Dato og tid for adgangsadressens oprettelse,' +
        ' som registreret i DAR. Eksempel: 2001-12-23T00:00:00.'
      },
      {
        name: 'ændret',
        type: 'localdatetime',
        nullable: true,
        description: 'Dato og tid hvor der sidst er ændret i adgangsadressen,' +
        ' som registreret i DAR. Eksempel: 2002-04-08T00:00:00.',
      },
      {
        name: 'ikrafttrædelsesdato',
        type: 'localdatetime',
        nullable: true,
        description: 'Adgangsadressens ikrafttrædelsesdato'
      }, {
        name: 'kommunekode',
        type: 'string',
        nullable: true,
        schema: definitions.NullableKode4,
        description: 'Kommunekoden. 4 cifre.'
      }, {
        name: 'vejkode',
        type: 'string',
        nullable: true,
        schema: definitions.NullableKode4,
        description: 'Identifikation af vejstykket, adgangsadressen befinder sig på.' +
        ' Er unikt indenfor den pågældende kommune. Repræsenteret ved fire cifre.' +
        ' Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.'
      }, {
        name: 'husnr',
        type: 'string',
        nullable: true,
        schema: definitions.Nullablehusnr,
        description: 'Husnummer der identificerer den pågældende adresse i forhold til andre adresser med samme vejnavn.' +
        ' Husnummeret består af et tal 1-999 evt. suppleret af et stort bogstav A..Z, og fastsættes i stigende orden,' +
        ' normalt med lige og ulige numre på hver side af vejen. Eksempel: "11", "12A", "187B".'
      }, {
        name: 'supplerendebynavn',
        type: 'string',
        nullable: true,
        schema: definitions.Nullablesupplerendebynavn,
        description: 'Et supplerende bynavn – typisk landsbyens navn – eller andet lokalt stednavn,' +
        ' der er fastsat af kommunen for at præcisere adressens beliggenhed indenfor postnummeret.' +
        ' Indgår som en del af den officielle adressebetegnelse. Indtil 34 tegn. Eksempel: ”Sønderholm”.'
      }, {
        name: 'postnr',
        type: 'string',
        nullable: true,
        schema: definitions.NullablePostnr,
        description: 'Postnummeret som adressen er beliggende i.'
      }, {
        name: 'ejerlavkode',
        type: 'integer',
        deprecated: true,
        nullable: true,
        schema: definitions.NullableUpTo7,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Benyt "jordstykke" i stedet. Angiver ejerlavkoden registreret i BBR.' +
        ' Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.'
      }, {
        name: 'matrikelnr',
        type: 'string',
        deprecated: true,
        nullable: true,
        schema: definitions.Nullablematrikelnr,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Benyt "jordstykke" i stedet. Angiver matrikelnummeret for jordstykket, som det var registreret i BBR.' +
        ' Repræsenteret ved Indtil 7 tegn: max. 4 cifre + max. 3 små bogstaver. Eksempel: ”18b”.'
      }, {
        name: 'esrejendomsnr',
        type: 'string',
        nullable: true,
        schema: definitions.Nullableesrejendomsnr,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret,' +
        ' ESR, som det matrikelnummer som adressen ligger på, er en del af.' +
        ' Stammer fra BBR.' +
        ' Repræsenteret ved op til syv cifre. Eksempel ”13606”.'
      }, {
        name: 'etrs89koordinat_øst',
        type: 'real',
        nullable: true,
        description: 'Adgangspunktets østlige koordiat angivet i koordinatsystemet UTM zone 32' +
        ' og ved brug af det fælles europæiske terrestriale referencesystem EUREF89/ETRS89.'
      }, {
        name: 'etrs89koordinat_nord',
        type: 'real',
        nullable: true,
        description: 'Adgangspunktets nordlige koordiat angivet i koordinatsystemet UTM zone 32' +
        ' og ved brug af det fælles europæiske terrestriale referencesystem EUREF89/ETRS89.'
      }, {
        name: 'nøjagtighed',
        type: 'string',
        schema: definitions['Nøjagtighed'],
        description: 'Kode der angiver nøjagtigheden for adressepunktet. Et tegn.' +
        ' ”A” betyder at adressepunktet er absolut placeret på et detaljeret grundkort,' +
        ' typisk med en nøjagtighed bedre end +/- 2 meter. ”B” betyder at adressepunktet er beregnet –' +
        ' typisk på basis af matrikelkortet, således at adressen ligger midt på det pågældende matrikelnummer.' +
        ' I så fald kan nøjagtigheden være ringere en end +/- 100 meter afhængig af forholdene.' +
        ' ”U” betyder intet adressepunkt.',
      }, {
        name: 'kilde',
        type: 'integer',
        nullable: true,
        description: 'Kode der angiver kilden til adressepunktet. Et tegn.' +
        ' ”1” = oprettet maskinelt fra teknisk kort;' +
        ' ”2” = Oprettet maskinelt fra af matrikelnummer tyngdepunkt;' +
        ' ”3” = Eksternt indberettet af konsulent på vegne af kommunen;' +
        ' ”4” = Eksternt indberettet af kommunes kortkontor o.l.' +
        ' ”5” = Oprettet af teknisk forvaltning."'
      }, {
        name: 'husnummerkilde',
        type: 'integer',
        nullable: true,
        description: 'Kode der angiver kilden til husnummeret. Et tal bestående af et ciffer.'
      }, {
        name: 'tekniskstandard',
        type: 'string',
        nullable: true,
        schema: definitions.NullableTekniskstandard,
        description: 'Kode der angiver den specifikation adressepunktet skal opfylde. 2 tegn.' +
        ' ”TD” = 3 meter inde i bygningen ved det sted hvor indgangsdør e.l. skønnes placeret;' +
        ' ”TK” = Udtrykkelig TK-standard: 3 meter inde i bygning, midt for længste side mod vej;' +
        ' ”TN” Alm. teknisk standard: bygningstyngdepunkt eller blot i bygning;' +
        ' ”UF” = Uspecificeret/foreløbig: ikke nødvendigvis placeret i bygning."'
      }, {
        name: 'tekstretning',
        type: 'real',
        nullable: true,
        schema: definitions.NullableTekstretning,
        description: 'Angiver en evt. retningsvinkel for adressen i ”gon”' +
        ' dvs. hvor hele cirklen er 400 gon og 200 er vandret.' +
        ' Værdier 0.00-400.00: Eksempel: ”128.34”.'
      }, {
        name: 'adressepunktændringsdato',
        type: 'localdatetime',
        nullable: true,
        description: 'Dato for sidste ændring i adressepunktet, som registreret af DAR.' +
        ' Eksempel: ”1998-11-17T00:00:00”'
      }, {
        name: 'esdhreference',
        type: 'string',
        nullable: true,
        description: 'Nøgle i ESDH system.'
      }, {
        name: 'journalnummer',
        type: 'string',
        nullable: true,
        description: 'Journalnummer.'
      },
      {
        name: 'højde',
        type: 'real',
        nullable: true,
        description: 'Højden (koten) er beregnet efter Dansk Vertikal Reference 1990 (DVR90) fra middelvandstanden i havene ved Danmarks kyster til terrænniveau.  Angivet i meter.'
      },
      {
        name: 'adgangspunktid',
        type: 'uuid',
        nullable: true,
        description: 'Adgangspunktets unikke ID'
      },
      {
        name: 'supplerendebynavn_dagi_id',
        type: 'string',
        nullable: true,
        description: 'DAGI ID på det supplerende bynavn, som adgangsadressen ligger i.'
      },
      {
        name: 'vejpunkt_id',
        type: 'uuid',
        nullable: true,
        description: 'Vejpunktets unikke ID.'
      },
      {
        name: 'navngivenvej_id',
        type: 'uuid',
        nullable: true,
        description: 'Den navngivne vejs unikke ID'
      }
    ]
  },
  adresse: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'uuid',
        description: 'Universel, unik identifikation af adressen af datatypen UUID.' +
        ' Er stabil over hele adressens levetid (ligesom et CPR-nummer)' +
        ' dvs. uanset om adressen evt. ændrer vejnavn, husnummer, postnummer eller kommunekode.' +
        ' Repræsenteret som 32 hexadecimale tegn. Eksempel: ”0a3f507a-93e7-32b8-e044-0003ba298018”.'
      },
      {
        name: 'status',
        type: 'integer',
        schema: definitions.Status,
        description: 'Adressens status. 1 indikerer en gældende adresse, 3 indikerer en foreløbig adresse.'
      }, {
        name: 'oprettet',
        type: 'localdatetime',
        description: 'Dato og tid for adressens oprettelse, som registreret hos DAR. Eksempel: 2001-12-23T00:00:00.'
      }, {
        name: 'ændret',
        type: 'localdatetime',
        description: 'Dato og tid hvor der sidst er ændret i adgangsadressen, som registreret hos DAR. Eksempel: 2002-04-08T00:00:00.'
      }, {
        name: 'ikrafttrædelsesdato',
        type: 'localdatetime',
        nullable: true,
        description: 'Adressens ikrafttrædelsesdato.',
      }, {
        name: 'adgangsadresseid',
        type: 'uuid',
        description: 'Identifier for adressens adgangsadresse. UUID.',
      }, {
        name: 'etage',
        type: 'string',
        description: 'Etagebetegnelse. Hvis værdi angivet kan den antage følgende værdier:' +
        ' tal fra 1 til 99, st, kl, k2 op til k99.',
        nullable: true,
        schema: definitions.NullableEtage
      }, {
        name: 'dør',
        type: 'string',
        nullable: true,
        schema: definitions.NullableDør,
        description: 'Dørbetegnelse. Hvis værdi angivet kan den antage følgende værdier:' +
        ' tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.'
      }, {
        name: 'kilde',
        type: 'integer',
        nullable: true,
        description: 'Kode der angiver kilden til adressen. Tal bestående af et ciffer.'
      },
      {
        name: 'esdhreference',
        type: 'string',
        nullable: true,
        description: 'Nøgle i ESDH system.'
      }, {
        name: 'journalnummer',
        type: 'string',
        nullable: true,
        description: 'Journalnummer.'
      }
    ]
  },
  ejerlav: {
    key: ['kode'],
    attributes: [
      {
        name: 'kode',
        type: 'integer',
        schema: definitions.UpTo7,
        description: 'Unik identifikation af det matrikulære ”ejerlav”.' +
        ' Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.'
      }, {
        name: 'navn',
        type: 'string',
        description: 'Det matrikulære ”ejerlav”s navn. Eksempel: ”Eskebjerg By, Bregninge”.'
      },
      {
        name: 'geo_version',
        type: 'integer',
        description: 'Versionsangivelse for geometrien. Inkrementeres hver gang geometrien ændrer sig i DAWA.'
      },
      {
        name: 'geo_ændret',
        type: 'timestamp',
        description: 'Tidspunkt for seneste ændring af geometrien registreret i DAWA.'
      },
      {
        name: 'ændret',
        type: 'timestamp',
        description: 'Tidspunkt for seneste ændring registreret i DAWA. Opdateres ikke hvis ændringen kun vedrører geometrien (se felterne geo_ændret og geo_version).'
      }
      ]
  },
  bygning: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'string',
        description: 'Bygningspolygonets unikke ID. Heltal.'
      },
      {
        name: 'bygningstype',
        type: 'string',
        description: 'Angiver bygningens type, eksempelvis "Bygning", "Drivhus", "Tank/Silo".'
      },
      {
        name: 'metode3d',
        type: 'string',
        description: `Angiver hvor Z-koordinaten er registreret. Fotogrammetrisk anvendes altid "Tag". 
        Dog kan "3D-Tag" anvendes, hvis det eksplicit er aftalt i forbindelse med 3D-bygningsmodellering.
        Anvendelse af ”Under terræn” muliggør registrering af en underjordisk bygning.
        Mulige værdier: 3D-Tag, Tag, Terræn, Under terræn, Ikke tildelt, Ukendt.`
      },
      {
        name: 'målested',
        type: 'string',
        description: 'Angiver målestedet for bygningspolygonet. Mulige værdier: "Tag", "Væg", "Tag og Væg", "Ukendt", "Ikke Tildelt".'
      },
      {
        name: 'bbrbygning_id',
        type: 'uuid',
        description: 'Angiver bygningens ID i Bygnings- og Boligregisteret (BBR). UUID.',
        nullable: true
      },
      {
        name: 'synlig',
        type: 'boolean',
        description: `Angiver, om en Bygning er synlig i et ortofoto. At den ikke er synlig skyldes, 
        at et andet GeoDanmark objekt skjuler den helt eller delvist eller at den ligger helt eller 
        delvist under jorden.
        "false"= Bygning er helt eller delvist usynlig i et ortofoto.
        "true"= Bygning er synlig i et ortofoto.
`
      },
      {
        name: 'overlap',
        type: 'boolean',
        description: `Angiver, om en Bygning overlappes helt eller delvist af en anden Bygning.
        "false"= Bygning er ikke helt eller delvist overlappet af en anden Bygning.
        "true"= Bygning er helt eller delvist overlappet af en anden Bygning.
`
      },
      {
        name: 'geometri',
        type: 'geometry3d',
        description: 'Bygningens geometri. Leveres som GeoJSON polygon.'
      }
    ]
  },
  bygningtilknytning: {
    key: ['bygningid', 'adgangsadresseid'],
    attributes: [
      {
        name: 'bygningid',
        type: 'integer',
        description: 'Bygningspolygonets unikke ID. Heltal.'
      },
      {
        name: 'adgangsadresseid',
        type: 'uuid',
        description: 'Adgangsadressens id.',
      }
    ]
  },
  jordstykke: {
    key: ['ejerlavkode', 'matrikelnr'],
    attributes: [
      {
        name: 'ejerlavkode',
        type: 'integer',
        schema: definitions.UpTo7,
        description: 'Unik identifikation af det matrikulære ”ejerlav”.' +
        ' Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.',
      },
      {
        name: 'matrikelnr',
        type: 'string',
        description: 'Unik identifikation af jordstykket indenfor ejerlavet. Består af bogstaver og tal.'
      },
      {
        name: 'kommunekode',
        type: 'string',
        description: 'Kommunekoden. 4 cifre.',
        schema: definitions.Kode4
      },
      {
        name: 'regionskode',
        type: 'string',
        description: 'Regionskoden. 4 cifre.',
        schema: definitions.Kode4
      },
      {
        name: 'sognekode',
        type: 'string',
        description: 'Sognekoden. 4 cifre.',
        schema: definitions.Kode4
      },
      {
        name: 'retskredskode',
        type: 'string',
        description: 'Retskredskoden. 4 cifre.',
        schema: definitions.Kode4
      },
      {
        name: 'esrejendomsnr',
        type: 'string',
        nullable: true,
        description: 'Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret, ESR, som jordstykket er en del af. Repræsenteret ved 7 cifre. Eksempel ”0035512”.',
      },
      {
        name: 'udvidet_esrejendomsnr',
        type: 'string',
        nullable: true,
        description: 'Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret, ESR, som jordstykket er en del af. Repræsenteret ved 10 cifre, hvor de første 3 cifre er kommunekoden hvor ejerskabet er placeret. Eksempel ”6070035512”.'
      },
      {
        name: 'sfeejendomsnr',
        type: 'string',
        nullable: true,
        description: 'SFE ejendomsnummer.'
      },
      {
        name: 'geometri',
        type: 'geometry',
        description: 'Jordstykkets geometri. Leveres som GeoJSON polygon.'
      },
      {
        name: 'featureid',
        description: 'Jordstykkets featureid, en unik identifikator som anvendes i matrikelkortet.',
        type: 'string'
      },
      {
        name: 'fælleslod',
        description: 'angivelse om jordstykket indgår i flere faste ejendomme.',
        type: 'boolean'
      },
      {
        name: 'moderjordstykke',
        description: 'featureid for det jordstykke som jordstykket er udstykket fra.',
        type: 'integer',
        nullable: true
      },
      {
        name: 'registreretareal',
        description: 'det i matriklen registrerede sande areal på jordstykket – ikke nødvendigvis identisk med det geometriske areal - angivet som heltal i kvadratmeter',
        type: 'integer'
      },
      {
        name: 'arealberegningsmetode',
        description: `angivelse af beregningsmåden for det registrerede areal for jordstykket – følgende koder benyttes:
        <ul>
        <li>o – arealet er beregnet efter opmåling</li>
        <li>s – arealet er beregnet efter konstruktion i større målforhold, dvs. større end det analoge matrikelkort</li>
        <li>k – arealet er beregnet på grundlag af kort</li></ul>`,
        type: 'string'
      },
      {
        name: 'vejareal',
        description: 'det i matriklen registrerede sande areal af vejudlæg på jordstykket angivet som heltal i kvadratmeter',
        type: 'integer'
      },
      {
        name: 'vejarealberegningsmetode',
        description: `angivelse af beregningsmåden for det registrerede areal af vej på jordstykket – følgende koder benyttes:
        <ul>
        <li>b – vejareal på jordstykket er beregnet (og kan være 0)</li>
        <li>e – der er konstateret vej på jordstykket, men areal er ikke beregnet</li>
        <li>u – det er ukendt, om der findes vej på jordstykket</li>
        </ul>`,
        type: 'string'
      },
      {
        name: 'vandarealberegningsmetode',
        description: `
        angivelse af beregningsmåden for det registrerede areal af vand på jordstykket – følgende koder benyttes:
        <ul>
        <li> incl – vandareal på jordstykket et inkluderet i det registrerede areal for jordstykket</li>
        <li> excl – vandareal på jordstykket er ikke inkluderet i det registrerede areal for jordstykket</li>
        <li>ukendt – vandareal er ikke oplyst</li> 
        </ul>`,
        type: 'string'
      }
    ]

  },
  jordstykketilknytning: {
    key: ['ejerlavkode', 'matrikelnr', 'adgangsadresseid'],
    attributes: [
      {
        name: 'ejerlavkode',
        type: 'integer',
        description: 'Ejerlavkoden.'
      },
      {
        name: 'matrikelnr',
        type: 'string',
        description: 'Matrikelnummeret for jordstykket.'
      },
      {
        name: 'adgangsadresseid',
        type: 'uuid',
        description: 'Adgangsadressens id.',
      }
    ]
  },
  navngivenvej: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'uuid',
        description: 'Den navngivne vejs unikke ID',
      },
      {
        name: 'darstatus',
        type: 'string',
        schema: definitions.DARStatus,
        description: 'Den navngivne vejs status i DAR.'
      },
      {
        name: 'oprettet',
        type: 'timestamp',
        description: 'Dato og tid for vejens oprettelse i DAR. Eksempel: 2001-12-23T00:00:00.',
      },
      {
        name: 'ændret',
        type: 'timestamp',
        description: 'Dato og tid for seneste ændring af vejen i DAR. Eksempel: 2002-04-08T00:00:00.',
      },
      {
        name: 'navn',
        type: 'string',
        description: 'Vejens navn. Repræsenteret ved indtil 40 tegn. Eksempel: ”Hvidkildevej”.',
        schema: definitions.Vejnavn
      }, {
        name: 'adresseringsnavn',
        type: 'string',
        nullable: true,
        schema: definitions.NullableVejnavnForkortet,
        description: 'En evt. forkortet udgave af vejnavnet på højst 20 tegn,' +
        ' som bruges ved adressering på labels og rudekuverter og lign., hvor der ikke plads til det fulde vejnavn.',
      }, {
        name: 'administrerendekommune',
        type: 'string',
        nullable: true,
        description: 'Kommunekoden for den kommune, som administrerer den navngivne vej.',
      }, {
        name: 'beskrivelse',
        type: 'string',
        nullable: true,
        description: 'En beskrivelse af den navngivne vej',
      }, {
        name: 'retskrivningskontrol',
        type: 'string',
        nullable: true,
        description: 'Styrelsen for Dataforsyning og Effektivisering har fem hverdage til at kontrollere retskrivningen af et nyt vejnavn. retskrivningskontrol angiver hvor i processen vejnavnet er. retskrivningskontrol kan antage følgende værdier: Udløbet, Afvist, Godkendt og Ikke Kontrolleret.',
      }, {
        name: 'udtaltvejnavn',
        type: 'string',
        nullable: true,
        description: `Vejnavnet skrevet fuldt ud, således som det udtales. Udtaltvejnavn anvendes
         for at gøre det nemmere at finde frem til et bestemt vejnavn, også i de tilfælde hvor der
          ingår forkortelser som ikke udtales som sådanne fx som Gl. Kongevej, der udtales Gammel
           Kongevej.`,
      },
      {
        name: 'beliggenhed_oprindelse_kilde',
        type: 'string',
        nullable: true,
        description: 'Kode som angiver hvilken part eller system, der er kilde til stedfæstelsen. Kilde er en kodeliste som klassificerer de forskellige typer af kilder til stedfæstelsen. fx med værdierne GeoDKgrundkort, Matrikelkort, Ekstern indberetning, Ejer/administrator/Lsp, Adressemyndigheden.'
      },
      {
        name: 'beliggenhed_oprindelse_nøjagtighedsklasse',
        type: 'string',
        nullable: true,
        description: 'Nøjagtighedsklasse: A: Manuelt sat, følger ikke GeoDanmark. B: Maskinelt sat, ud fra GeoDanmark. C: Manuelt sat, kommer til at følge GeoDanmark.'
      },
      {
        name: 'beliggenhed_oprindelse_registrering',
        type: 'timestamp',
        nullable: true,
        description: 'Tidsstempel som angiver seneste opdatering af stedfæstelsen i DAR.\n' +
        'Registreringstidspunktet angiver hvornår den pågældende stedfæstelse senest er ajourført. Oplysningen giver brugerne mulighed for at vurdere om stedfæstelsen er opdateret i forhold til andre relevante objekter.'
      },
      {
        name: 'beliggenhed_oprindelse_tekniskstandard',
        type: 'string',
        nullable: true,
        description: 'Kode som angiver den tekniske standard, der er anvendt ved stedfæstelsen.\n' +

        'N0: Vejnavnebeliggenheden kan være et vejnavneområde, som omslutter vejens adresser, eller en vejmidte som kommer fra GeoDanmark eller er konstrueret i DAR.'
      }
    ]
  },
  postnummer:
    {
      key: ['nr'],
      attributes: [
        {
          name: 'nr',
          type: 'string',
          schema: definitions.Postnr,
          description: 'Unik identifikation af det postnummeret. Postnumre fastsættes af Post Danmark.' +
          ' Repræsenteret ved fire cifre. Eksempel: ”2400” for ”København NV”.'
        },
        {
          name: 'navn',
          type: 'string',
          schema: definitions.PostnrNavn,
          description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn.' +
          ' Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.'
        },
        {
          name: 'stormodtager',
          type: 'boolean',
          description: 'Hvorvidt postnummeret er en særlig type,' +
          ' der er tilknyttet en organisation der modtager en større mængde post.'
        }]
    },
  stedtilknytning: {
    key: ['stedid', 'adgangsadresseid'],
    attributes: [{
      name: 'stedid',
      type: 'uuid',
      description: 'stedets ID',
    }, {
      name: 'adgangsadresseid',
      type: 'uuid',
      description: 'adgangsadressens ID'
    }]
  },
  stednavntilknytning: {
    key: ['stednavn_id', 'adgangsadresse_id'],
    attributes: [{
      name: 'stednavn_id',
      type: 'uuid',
      description: 'stednavnets ID',
    }, {
      name: 'adgangsadresse_id',
      type: 'uuid',
      description: 'adgangsadressens ID'
    }]
  },
  vejpunkt: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'uuid',
        description: 'Vejpunktets unikke ID.',
      },
      {
        name: 'kilde',
        type: 'string',
        description: 'Vejpunktets kilde.'
      },
      {
        name: 'tekniskstandard',
        type: 'string',
        description: 'Vejpunktets tekniske standard.'
      },
      {
        name: 'nøjagtighedsklasse',
        type: 'string',
        description: 'Vejpunktets nøjagtighedsklasse.'
      },
      {
        name: 'position',
        type: 'geometry',
        description: 'Vejpunktets position.'
      },

    ]
  },
  vejstykke: {
    key: ['kommunekode', 'kode'],
    attributes: [
      {
        name: 'id',
        type: 'string',
        description: 'Vejstykkets unikke ID (UUID).',
        schema: definitions.UUID
      },
      {
        name: 'kommunekode',
        type: 'string',
        description: 'Kommunekoden. 4 cifre.',
        schema: definitions.Kode4,

      },
      {
        name: 'kode',
        type: 'string',
        schema: definitions.Kode4,
        description: 'Identifikation af vejstykke. Er unikt indenfor den pågældende kommune. ' +
        'Repræsenteret ved fire cifre. Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.'
      },
      {
        name: 'oprettet',
        type: 'localdatetime',
        deprecated: true,
        nullable: true,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Oprettelsestidspunktet for vejstykket som registreret i BBR'
      }, {
        name: 'ændret',
        type: 'localdatetime',
        deprecated: true,
        nullable: true,
        description: 'DEPRECATED. Feltet opdateres ikke længere. Tidspunkt for seneste ændring af vejstykket, som registreret i BBR'
      }, {
        name: 'navn',
        type: 'string',
        nullable: true,
        schema: definitions.NullableVejnavn,
        description: 'Vejens navn som det er fastsat og registreret af kommunen. ' +
        'Repræsenteret ved indtil 40 tegn. Eksempel: ”Hvidkildevej”.'
      }, {
        name: 'adresseringsnavn',
        type: 'string',
        nullable: true,
        schema: definitions.NullableVejnavnForkortet,
        description: 'En evt. forkortet udgave af vejnavnet på højst 20 tegn,' +
        ' som bruges ved adressering på labels og rudekuverter og lign., hvor der ikke plads til det fulde vejnavn.'
      },
      {
        name: 'navngivenvej_id',
        type: 'uuid',
        description: 'Den navngivne vej, som vejstykket tilhører'
      }
    ]
  },
  vejstykkepostnummerrelation: {
    key: ['kommunekode', 'vejkode', 'postnr'],
    attributes: [
      {
        name: 'kommunekode',
        type: 'string',
        schema: definitions.Kode4,
        description: 'Kommunekoden. 4 cifre.'
      }, {
        name: 'vejkode',
        type: 'string',
        schema: definitions.Kode4,
        description: 'Vejkoden. 4 cifre.'
      }, {
        name: 'postnr',
        type: 'string',
        schema: definitions.Kode4,
        description: 'Postnummeret. 4 cifre.'
      }]
  },

};

for (let temaModel of temaModels.modelList) {
  if(!temaModel.withoutTilknytninger) {
    module.exports[temaModel.tilknytningName] = temaModels.toReplikeringTilknytningModel(temaModel);
  }
}

for(let [entityName, model] of Object.entries( darReplikeringModels.currentReplikeringModels)) {
  module.exports[`dar_${entityName.toLowerCase()}_aktuel`] = model;
}

for(let [entityName, model] of Object.entries( darReplikeringModels.historyReplikeringModels)) {
  module.exports[`dar_${entityName.toLowerCase()}_historik`] = model;
}

const getDefaultSchema = (type, nullable) => {
  const schemaType = defaultSchemas[type];
  assert(schemaType);
  return nullable ? schemaUtil.nullable(schemaType) : schemaType;
};

for(let modelName of Object.keys(module.exports)) {
  const model = module.exports[modelName];
  for(let attr of model.attributes) {
    attr.schema = attr.schema || getDefaultSchema(attr.type, attr.nullable);
    attr.deprecated = !!attr.deprecated;
  }
}