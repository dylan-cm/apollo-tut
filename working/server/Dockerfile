FROM node:12.18-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app

ENV PORT 4000
ENV HOST 0.0.0.0

COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production
COPY . .
CMD ["npm", "start"]
