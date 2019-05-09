FROM mdillon/postgis
RUN localedef -i da_DK -c -f UTF-8 -A /usr/share/locale/locale.alias da_DK.UTF-8
ENV LANG da_DK.utf8
COPY packages/server/psql/dictionaries/released/* /usr/share/postgresql/11/tsearch_data/