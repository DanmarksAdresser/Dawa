# Konfiguration af DAWA og services
Alle node scripts følger en fælles standard for hvordan konfigurationsparametre angives.
For en liste over mulige konfigurationsparametre køres scriptet med --help, f.eks.
```
 $> node server.js --help
```

Der er tre måder man kan angive en konfigurationsparameter på:

Via en environment variabel:

```
 $> pgConnectionUrl=postgres://dawa@localhost/dawa node server.js
```

Via en parameter til applikationen:

```
 $> node server.js --pgConnectionUrl=postgres://dawa@localhost/dawa
```

Via en konfigurationsfil:

```
 $> node server.js --configurationFile=server-config.json
```

Konfigurationsfilen skal indeholde et JSON-objekt:

```json
{
  "pgConnectionUrl": "postgres://ahj@localhost/dawatest",
  "listenPort": 3000
}
```

## Konfiguration af logning
Som udgangspunkt logges alt på stdout. det er muligt at konfigurere logning ved at angive en logConfiguration parameter, som skal
udpege en fil med logkonfiguration:

```
 $> node server.js --logConfiguration=server-log-config.json
```

Logkonfigurationen skal indeholde et JSON-objekt med følgende properties:

```json
{
  "directory": ".",
  "fileNameSuffix": "logtest.log",
  "maxSize": 1000000000,
  "maxFiles": 10,
  "defaultLevel": "info",
  "levels": {
    "sql" : "error",
    "http" : "debug"
  }
}
```

Når der logges til fil logges der i JSON-format.

### Særligt om server.js
server.js kører som udgangspunkt i clustering mode, hvilket betyder at der startes et antal node-processer op. Hver node
proces logger i sin egen fil. logfilen prefikses med process ID (pid) for processen. Der vil derfor komme et antal filer i det bibliotek
som der logges i.