import { NextFunction, Request, Response } from 'express'

class Context {
  logger: any
}

export interface ExtendedRequest extends Request {
  context?: Context
}

export interface ErrorObject {
  serviceName: string
  code: string
  fields?: { [key: string]: any }
  httpStatusCode: number
  message: string
  context?: any
  originalError?: any
  inputParams: any
  endpointUrl: string
}

function filteringSensitiveData(inputParams: any) {
  const sensitiveFields = [
    'username',
    'email',
    'password',
  ]
  const keys = Object.keys(inputParams)
  for (const key of keys) {
    const isSensitiveField = sensitiveFields.includes(key)
    if (isSensitiveField) {
      inputParams[key] = '*****'
    }
  }
}

function errorMiddleware(serviceName: string) {
  return (error: any, request: ExtendedRequest, response: Response, next: NextFunction): void => {
    const inputParams = request.body || {}
    filteringSensitiveData(inputParams)

    const errorObject: ErrorObject = {
      serviceName,
      code: error.code || 'COM-0',
      message: error.message || 'There was an unhandled operation error.',
      context: error.context || {},
      originalError: error.originalError || error,
      httpStatusCode: error._httpStatusCode || 500,
      endpointUrl: request.url,
      inputParams,
    }

    if (error.name === 'ValidateError' && error.fields) {
      errorObject.code = 'COM-3'
      errorObject.message = 'Invalid operation parameters.'
      errorObject.fields = error.fields
      errorObject.httpStatusCode = 400
      errorObject.originalError = {}
    }

    if (error.type === 'entity.parse.failed') {
      errorObject.code = 'COM-5'
      errorObject.httpStatusCode = error.statusCode || error.status || 400
      errorObject.message = error.message || 'Request body is not a valid JSON.'
    }

    if (!response.status) {
      next(error)
    }

    const logger = request.context && request.context.logger ? request.context.logger : console
    logger.error(errorObject)

    response.status(errorObject.httpStatusCode).send({ ...errorObject })
  }
}

export default errorMiddleware
