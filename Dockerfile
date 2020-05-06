# image of node to build from
FROM node:12
# working dir inside container
WORKDIR /usr/src/app
COPY package*.json ./

RUN npm install
# Bundle app source
COPY . .
EXPOSE 8100
CMD [ "npm", "start" ]
