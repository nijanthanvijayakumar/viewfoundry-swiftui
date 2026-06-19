FROM node:22-alpine

WORKDIR /workspace

COPY . .

CMD ["sh", "scripts/docker-check.sh"]
