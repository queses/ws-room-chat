FROM node:16-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm config set update-notifier false && npm i

COPY . .

RUN npm run build
EXPOSE 5003

CMD ["node", "./dist/", "server"]
