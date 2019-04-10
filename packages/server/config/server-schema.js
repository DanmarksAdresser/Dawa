const {mergeConfigSchemas} = require('@dawadk/common/src/config/holder');
const s3OffloadSchema = require('@dawadk/import-util/src/config/schemas/s3-offload-common-schema');
module.exports = mergeConfigSchemas([s3OffloadSchema,
  {
    port: {
      format: 'nat',
      doc: "Socket port der lyttes på",
      default: 3000
    },
    master_port: {
      doc: 'Socket port masteren lytter på (isalive)',
      format: 'nat',
      default: 3001
    },
    processes: {
      doc: "Antal NodeJS worker processer der startes",
      format: 'nat',
      default: 4,
      cli: true
    },
    socket_timeout_millis: {
      "doc": "Socket timeout",
      "format": "nat",
      "default": 30000
    },
    database_url: {
      doc: "URL for databaseforbindelse",
      format: 'string',
      default: null,
      cli: true,
      required: true
    },
    pg: {
      pool: {
        max: {
          doc: "Max antal samtidige PostgreSQL queries per proces",
          format: 'nat',
          default: 150
        },
        idle_timeout_millis: {
          doc: "Hvor lang tid der går før idle Postgres connections kan lukkes ned",
          format: 'nat',
          default: 10000
        },
        max_waiting_clients: {
          doc: "Hvor mange klienter, der maksimalt kan vente på at fåen Postgres connection",
          format: 'nat',
          default: 150
        },
        acquire_timeout_millis: {
          doc: "Hvor lang tid en klient venter i kø på at få en DB connection",
          format: 'nat',
          default: 500
        },
        statement_timeout_millis: {
          doc: "Maksimal query-tid for et PostgreSQL statement, for query afbrydes",
          format: 'nat',
          default: 10000
        }
      }
    },
    query_scheduler: {
      timeout_millis: {
        doc: "Hvor lang tid scheduleren venter på beskeder",
        format: 'nat',
        default: 30000
      },
      slots: {
        doc: "Antal samtidige PostgreSQL queries",
        format: 'nat',
        default: 6
      },
      priority_slots: {
        doc: "Antal query slots, der er reserveret til klienter med høj prioritet",
        format: 'nat',
        default: 3
      },
      slots_per_source: {
        doc: "Maximum slots consumed by a single source",
        format: 'nat',
        default: 3
      },
      initial_priority_offset_millis: {
        doc: "Querytid der tildeles nye klienter",
        format: 'nat',
        default: 10000
      },
      required_priority_offset_millis: {
        doc: "Krævet queryitd for at klient kan udføre queries med høj prioritet",
        format: 'nat',
        default: 1000
      },
      cleanup_interval_millis: {
        doc: "Oprydningsinterval for klientliste",
        format: 'nat',
        default: 5000
      }
    },
    connection_scheduler: {
      slots: {
        doc: "Maksimale antal åbne databaseforbindelser",
        format: 'nat',
        default: 200
      },
      slots_per_source: {
        doc: "Maksimalt antal forbindelser pr. klient-IP",
        format: 'nat',
        default: 10
      },
      timeout: {
        doc: "Maksimal ventetid for release af connection",
        format: 'nat',
        default: 30000
      }
    },
    ois: {
      enabled: {
        doc: "whether OIS API is enabled",
        format: 'Boolean',
        default: false
      },
      protected: {
        doc: "Whether the OIS API is password protected",
        format: 'Boolean',
        default: true
      },
      login: {
        doc: "OIS login (username)",
        format: 'string',
        default: 'ois'
      },
      password: {
        doc: "OIS password",
        format: 'string',
        sensitive: true,
        default: null
      }
    },
    autocomplete: {
      query_slot_timeout: {
        doc: "Autocomplete query slot timeout",
        format: 'nat',
        default: 2000
      }
    },
    replication: {
      enabled: {
        doc: "Whether the replication API is disabled. Should be disabled for backup env.",
        format: 'boolean',
        default: false
      }
    }
  }]);