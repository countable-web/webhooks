FROM node:18

WORKDIR /app

COPY .env package.json package-lock.json ./
RUN npm install

COPY . .

CMD ["node", "server.js"]

