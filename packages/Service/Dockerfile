FROM node:12

WORKDIR /app
COPY package.json package.json
COPY /dist .
COPY /src/service/config.json service/config.json
COPY /src/service/main.proto service/main.proto
COPY /node_modules /node_modules

# RUN npm install --loglevel notice --production

CMD ["npm", "start"]