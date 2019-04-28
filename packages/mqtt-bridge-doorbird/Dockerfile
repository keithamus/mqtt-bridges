FROM node:11-alpine
WORKDIR /home/node
USER node
COPY index.js package.json package-lock.json ./
RUN npm i
ENTRYPOINT ["npm", "start"]
