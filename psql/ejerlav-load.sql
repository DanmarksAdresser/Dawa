

\set ON_ERROR_STOP on
\set ECHO queries

INSERT INTO ejerlav SELECT ejerlavkode, ejerlavnavn FROM adgangsadresser WHERE ejerlavkode <> 0 GROUP BY ejerlavkode, ejerlavnavn;
