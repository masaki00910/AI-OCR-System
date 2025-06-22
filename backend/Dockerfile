FROM node:18-alpine

WORKDIR /app

# Install dependencies for development, sharp, and pdf2pic
RUN apk add --no-cache python3 make g++ vips-dev imagemagick ghostscript graphicsmagick

COPY package*.json ./
# npm installを使用してpackage-lock.jsonを生成
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]