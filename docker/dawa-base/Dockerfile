FROM node:lts
RUN apt-get update
RUN apt-get install -y p7zip-full
WORKDIR /app
COPY . .
RUN yarn install
