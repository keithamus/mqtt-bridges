FROM node:11-alpine
WORKDIR /home/node
USER node
COPY *.js *.json ./
RUN npm i
ENTRYPOINT ["npm", "start"]
