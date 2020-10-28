  
FROM node:12

WORKDIR /app
COPY package.json package.json
RUN npm install --loglevel notice --production

COPY /dist .
COPY /src/service/config.json service/config.json
COPY /src/service/main.proto service/main.proto

CMD ["npm", "start"]