FROM node:20-alpine AS builder

ARG VITE_API_BASE_URL="http://localhost:8000"
ARG VITE_API_VERSION="v1"
ARG VITE_API_TIMEOUT="30000"

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_VERSION=$VITE_API_VERSION
ENV VITE_API_TIMEOUT=$VITE_API_TIMEOUT

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com && \
    npm config set strict-ssl false && \
    npm install --include=dev

COPY . .
RUN npm run build


FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]