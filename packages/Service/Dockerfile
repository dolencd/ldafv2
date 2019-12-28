FROM node:12
RUN apt-get update
RUN apt-get install -y unzip
ADD . /App
WORKDIR /App
RUN npm install
EXPOSE 3000
CMD [ "npm", "start" ]
