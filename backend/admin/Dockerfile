FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

# better-sqlite3 needs native binding, node-gyp deps
RUN apk add --no-cache python3 make g++ && npm rebuild better-sqlite3

EXPOSE 3000
CMD ["node", "server.js"]
