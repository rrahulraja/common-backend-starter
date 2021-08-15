import pino from 'pino'
import expressPino from 'express-pino-logger'

export const logger = pino({
  base: null,
  timestamp: false,
  level: process.env.LOG_LEVEL || 'info',
})

export const expressLogger = expressPino({
  logger,
})
