FROM node:alpine

COPY ./ /usr/app
WORKDIR /usr/app

RUN npm install
RUN npm install serve -g
RUN npm run build

EXPOSE 3000
CMD ["serve", "-s", "build"]

