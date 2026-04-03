FROM node:20-alpine

WORKDIR /app

# Install dependencies for sharp
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 5000
CMD ["node", "src/index.js"]
