# docker file for the backend 

````

FROM node:18-alpine

RUN npm install -g pm2

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3006

CMD [ "pm2-runtime" , "index.js"]

````

# CHANGES in the .env for the database 

<img width="1145" height="292" alt="image" src="https://github.com/user-attachments/assets/9feff85d-e143-499c-b6db-d97d3ccbb987" />

# add frontend ip in the index.js to avoid cors error 

<img width="703" height="226" alt="image" src="https://github.com/user-attachments/assets/9e429711-ce3f-4235-8f68-0da0fd8a70fc" />






