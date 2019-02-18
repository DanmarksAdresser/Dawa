FROM node:lts
WORKDIR /app
COPY . .
RUN yarn install
EXPOSE 3000
EXPOSE 3001
CMD ["node_modules/.bin/dawa-server"]