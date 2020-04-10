FROM node:12

WORKDIR /app
COPY package.json package.json
COPY /node_modules /node_modules

# RUN npm install --loglevel notice --production

CMD ["npm", "start"]