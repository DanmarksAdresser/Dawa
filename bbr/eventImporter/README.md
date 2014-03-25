BBR event importer
------------------

Dette script importerer og processerer BBR-hændelser. Hændelserne hentes fra DynamoDB, hvor BBR facaden har gemt dem.

Én kørsel af scriptet indlæser *alle* udestående hændelser.

Mulige parametre kan angives enten som environment variables eller som kommandolinjeparametre. For en kort oversigt
over mulige parametre køres
```
node main.js --help .
```