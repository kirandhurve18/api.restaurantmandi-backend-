FROM node:18-alpine

RUN npm install -g pm2

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3006

CMD [ "pm2-runtime" , "index.js"]
