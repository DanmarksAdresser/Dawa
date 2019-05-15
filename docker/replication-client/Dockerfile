FROM node:lts
WORKDIR /app
COPY ./package.json .
COPY ./yarn.lock .
COPY ./packages/common ./packages/common
COPY ./packages/import-util ./packages/import-util
COPY ./packages/replication-client ./packages/replication-client
RUN yarn install
CMD /bin/bash
ENTRYPOINT node_modules/.bin/dawa-replication-client