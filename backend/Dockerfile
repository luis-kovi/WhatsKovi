FROM node:20-alpine

RUN apk add --no-cache \
  openssl \
  chromium \
  chromium-chromedriver \
  nss \
  freetype \
  harfbuzz \
  ttf-freefont

ENV CHROMIUM_PATH=/usr/bin/chromium-browser \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
