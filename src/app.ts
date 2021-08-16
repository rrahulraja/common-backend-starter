import './env'

import express from 'express'
import * as Sentry from '@sentry/node'
import swaggerUi from 'swagger-ui-express'
import get from 'lodash.get'
import path from 'path'
import { promises as fs } from 'fs'
import prometheusMiddleware from 'express-prometheus-middleware'

import { expressLogger, logger } from './shared/logger'
import { blockUnusedMethods, corsMiddleware, registerSecurityMiddleware, contextMiddleware, healthMiddleware, errorMiddleware } from './middlewares'
import { ErrorObject } from './middlewares/errorMiddleware'

const yaml = require('js-yaml')
const { PORT, LOG_REQUESTS_RESPONSES, ENVIRONMENT, NODE_ENV, SENTRY_DSN } = process.env

const DEFAULT_EXIT_TIMEOUT = 1000 // milliseconds

export default class BaseApplication {
  private readonly _config: any
  private readonly _appDir: string
  private _isReady: boolean
  protected readonly logger: any
  public context: any
  public apiKeyRedis: any
  public server: any

  constructor(appDir: string, config?: any) {
    console.log('Constructing')

    Sentry.init({
      dsn: SENTRY_DSN,
      beforeSend: (event) => {
        if (event.user) {
          // Don't send user's attribute
          delete event.user.email
          delete event.user.ip_address
          delete event.user.id
          delete event.user.username
        }

        if (event.request) {
          if (event.request.headers) {
            // Client IP is only other backend service so this should be fine to stay
            // delete event.request.headers['X-Forwarded-For']
            // delete event.request.headers['X-Real-Ip']
            // Access tokens can be decoded to get PII
            delete event.request.headers.authorization
          }

          if (event.request.data) {
            // can be decoded to get PII
            delete event.request.data.credentialOfferResponseToken
            delete event.request.data.credentialOfferRequestToken
            delete event.request.data.audienceDid
            delete event.request.data.offeredCredentials
            delete event.request.data.encryptedSeed
            delete event.request.data.username
            delete event.request.data.issuerDid
            delete event.request.data.subjectDid
            delete event.request.data.credentialShareResponseToken
          }
        }

        return event
      },
    })

    this._config = config
    this.logger = logger
    this._appDir = appDir
    this._isReady = false
    this.context = {
      logger: this.logger,
    }

    this.apiKeyRedis = null
    this.server = null
  }

  get exitTimeout(): number {
    return get(this._config, 'exitTimeout', DEFAULT_EXIT_TIMEOUT)
  }

  get port(): number {
    return get(this._config, 'server.port', PORT)
  }

  get serviceName(): string {
    return get(this._config, 'serviceName')
  }

  get publicPaths(): string[] {
    return get(this._config, 'publicPaths', [])
  }

  get apiKeyMiddlewareEnabled(): boolean {
    return get(this._config, 'apiKeyMiddlewareEnabled', false)
  }

  async initSwagger(): Promise<void> {
    const swaggerPath = path.join(this._appDir, '..', 'swagger.json')
    const swaggerData = JSON.parse(await fs.readFile(swaggerPath, { encoding: 'utf-8' }))
    const errorsYaml = await fs.readFile('config/errors.yaml')
    const object = yaml.safeLoad(errorsYaml)

    swaggerData.components.schemas.Errors = {
      properties: object.errors,
    }

    swaggerData.components = {
      ...swaggerData.components,
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'Api-Key',
          description: 'Api Key for API Access',
        },
        bearerAuth: {
          scheme: 'bearer',
          bearerFormat: 'bearer',
          type: 'http',
          in: 'headers',
          name: 'authorization',
          description: 'User Authentication',
        },
      },
    }

    const swaggerConfig = {
      swaggerOptions: {
        displayOperationId: true,
      },
    }

    this.server.use('/api/swagger', express.static(swaggerPath))
    this.server.use('/api-docs', swaggerUi.serve)
    this.server.get('/api-docs', swaggerUi.setup(swaggerData, swaggerConfig))
  }

  async createServer(): Promise<void> {
    this.logger.info('Create Server...')

    this.server = express()

    // The request handler must be the first middleware on the app
    this.server.use(Sentry.Handlers.requestHandler())

    if (LOG_REQUESTS_RESPONSES) {
      this.server.use(expressLogger)
    }

    this.server.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')
      next()
    })

    registerSecurityMiddleware(this.server)
    this.server.use(blockUnusedMethods)

    this.server.use(corsMiddleware)
    this.server.options('*', corsMiddleware)

    this.server.use(contextMiddleware(this.context))

    this.server.use(express.json())

    if (NODE_ENV !== 'test') {
      this.server.use(
        prometheusMiddleware({
          metricsPath: '/metrics',
          collectDefaultMetrics: true,
          requestDurationBuckets: [0.1, 0.5, 1, 1.5],
        }),
      )
    }

    if (ENVIRONMENT !== 'prod') {
      await this.initSwagger()
    }

    this.server.use(healthMiddleware)

    const routesPath = `${this._appDir}/routes/routes`
    const { RegisterRoutes } = require(routesPath)
    RegisterRoutes(this.server)

    // The error handler must be before any other error middleware and after all controllers
    this.server.use(Sentry.Handlers.errorHandler())

    this.server.use(errorMiddleware(this.serviceName))
  }

  async initialize(serviceContext?: any): Promise<void> {
    this.context = {
      ...this.context,
      ...serviceContext,
    }

    this.logger.debug('App is creating server')
    await this.createServer()
  }

  async start(): Promise<any> {
    try {
      this.logger.debug('App is starting')
      this.logger.debug(`[http] Trying to start server on ${this.port}`)
      await this.initialize()
    } catch (error) {
      const fatalErrorMessage = `[app] Initialization error, shutdown in ${this.exitTimeout}ms`
      const serviceName: string = this.serviceName
      const errorObject: ErrorObject = {
        serviceName,
        code: error.code || 'COM-0',
        message: error.message || fatalErrorMessage,
        context: error.context || {},
        originalError: error.originalError || error,
        httpStatusCode: 500,
        endpointUrl: 'App intialisation error',
        inputParams: {},
      }

      this.logger.error(error)
      this.logger.fatal(fatalErrorMessage)

      return setTimeout(() => process.exit(1), this.exitTimeout)
    }

    return new Promise((resolve) =>
      this.server.listen(this.port, () => {
        this._isReady = true

        this.logger.info(`[http] Server is listening on port ${this.port}`)
        resolve(this)
      }),
    )
  }
}
