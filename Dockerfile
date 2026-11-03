FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node database ./database
COPY --chown=node:node dist ./dist
RUN mkdir -p /app/data /app/backups && chown node:node /app/data /app/backups
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
USER node
EXPOSE 3000
CMD ["node","server/index.mjs"]
