FROM node:12

WORKDIR /app
COPY package.json package.json
COPY /dist .

RUN npm install --loglevel notice --production --registry "http://localhost:4873"

CMD ["npm", "start"]