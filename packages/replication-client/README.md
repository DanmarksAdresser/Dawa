# DAWA replication client

This is a reference-implementation for the [DAWA](https://dawa.aws.dk) [replication api](https://dawa.aws.dk/dok/guide/replikering).

The client can be used to establish and update a local database copy of the data provided by DAWA.

The reference client is command-line based and currently only supports PostgreSQL.

## Usage
The following commands are supported: 
```
Usage: dawa-replication-client [options] [command]

Options:
  -v, --version              output the version number
  -h, --help                 output usage information

  replicate [options]        Replicate data to local database
  gen-config [options]       Generate a configuration for the client
  gen-schema [options]       Generate a database schema
  validate-config [options]  Validate a configuration file.
```

You can get help on a specific command by using the <code>-h</code> option:

```
ahj$ dawa-replication-client gen-config -h
Usage: gen-config [options]

Generate a configuration for the client.

Options:
  --url [value]       URL of replication API, default "https://dawa.aws.dk/replikering"
  --file [value]      Output file for configuration
  --entities [value]  Comma-separated list of entities to include
  -h, --help          output usage information 
```

Check out the [guide](https://dawa.aws.dk/dok/guide/replikeringsklient) for information on how to use the client.

## Contributing
We welcome contributions to this project. Please get in touch by email or by opening a feature request.

## Additional database support
We have no plans for adding support for additional databases in the near future.

## Support
Please use use the [Digitaliser forum](https://digitaliser.dk/group/334445/forum).

## license
Copyright Styrelsen for Dataforsyning og Effektivisering ([SDFE](https://sdfe.dk))

Licensed under the MIT/X11 license.