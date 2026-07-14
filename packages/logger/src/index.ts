import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = isDev
  ? pino({
      level: process.env.LOG_LEVEL ?? 'info',
      transport: {
        target: 'pino-pretty',
        options: { ignore: 'pid,hostname' },
      },
    })
  : pino({ level: process.env.LOG_LEVEL ?? 'info' })

export default logger
