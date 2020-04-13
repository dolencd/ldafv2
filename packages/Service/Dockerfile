  
FROM node:12

WORKDIR /app
COPY package.json package.json
COPY /dist .
COPY /src/service/config.json service/config.json
COPY /src/service/main.proto service/main.proto

RUN npm install --loglevel notice --production --registry "http://localhost:4873"

CMD ["npm", "start"]