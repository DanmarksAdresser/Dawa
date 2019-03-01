module.exports = {
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
    type: 'nat',
    default: 4
  },
  pg: {
    url: {
      doc: "URL for databaseforbindelse",
      format: 'String',
      env: 'pgConnectionUrl'
    },
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
        type: 'nat',
        default: 150
      },
      acquire_timeout_millis: {
        doc: "Hvor lang tid en klient venter i kø på at få en DB connection",
        type: 'nat',
        default: 500
      },
      statement_timeout_millis: {
        doc: "Maksimal query-tid for et PostgreSQL statement, for query afbrydes",
        type: 'nat',
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
      type: 'nat',
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
      type: 'nat',
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
      doc: "whether OIS API is enabled (0=disabled, 1=enabled)",
      format: 'Boolean',
      default: false
    },
    protected: {
      doc: "Whether the OIS API is password protected",
      format: 'Boolean',
      default: true
    },
    login: {
      description: "OIS login (username)",
      format: 'String',
      default: 'ois'
    },
    password: "OIS password",
    format: 'String',
    sensitive: true
  },
  autocomplte: {
    query_slot_timeout: {
      doc: "Autocomplete query slot timeout",
      format: 'nat',
      default: 2000
    }
  },
  replication: {
    enabled: {
      doc: "Whether the replication API is disabled. Should be disabled for backup env.",
      type: 'nat'
    }
  }
};