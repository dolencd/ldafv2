FROM node:12

WORKDIR /app
COPY package.json package.json
RUN npm install --loglevel notice --production

COPY /dist .

CMD ["npm", "start"]