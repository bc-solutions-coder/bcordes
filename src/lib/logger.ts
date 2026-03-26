import pino from 'pino'
import pretty from 'pino-pretty'

const METHOD_COLORS: Record<string, string> = {
  GET: '\x1b[36m',
  POST: '\x1b[33m',
  PUT: '\x1b[34m',
  PATCH: '\x1b[35m',
  DELETE: '\x1b[31m',
}
const RESET = '\x1b[0m'

function colorMethod(method: string): string {
  const color = METHOD_COLORS[method] ?? ''
  return color ? `${color}${method}${RESET}` : method
}

const isDev = process.env.NODE_ENV !== 'production'

const logger = isDev
  ? pino(
      { level: process.env.LOG_LEVEL ?? 'info' },
      pretty({
        ignore: 'pid,hostname',
        messageFormat: (log, messageKey) => {
          const msg = String(log[messageKey] ?? '')
          const method = log['method'] as string | undefined
          if (!method) return msg
          return msg.replace(method, colorMethod(method))
        },
      }),
    )
  : pino({ level: process.env.LOG_LEVEL ?? 'info' })

export default logger
