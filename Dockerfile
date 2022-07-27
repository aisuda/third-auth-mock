FROM node:16

WORKDIR /app
ADD . /app
RUN cd /app && npm i --production

CMD ["sh", "-c", "node /app/src/index.js"]