const { STATUS_CODES } = require('http')
const pick = require('lodash.pick')

const fs = require('fs')
const { safeLoad } = require('js-yaml')

const loadYaml = (path: string) => {
  const yaml = fs.readFileSync(path)
  const object = safeLoad(yaml)

  return object
}

export default class OperationError extends Error {
  private _code: string
  private _context: any
  private _originalError: any
  private _error: any
  private _logger: any

  constructor(codeOrError: any, context: any = {}, originalError: any = {}) {
    const isCode = typeof codeOrError === 'string'

    const code = isCode ? codeOrError : codeOrError.code
    const error = isCode ? OperationError.errors[code] : codeOrError

    if (!error) {
      throw new Error(`Invalid operation error code: ${code}`)
    }

    const message = OperationError.renderMessage(error.message, context)
    error.message = message

    super(error.message)

    this._code = code
    this._context = context
    this._error = error
    this._originalError = originalError
  }

  set logger(value) {
    this._logger = value
  }

  get logger() {
    return this._logger
  }

  get _type() {
    return this._error.type || 'OperationError'
  }

  get code() {
    return this._code
  }

  get context() {
    return this._context
  }

  get originalError() {
    return this._originalError
  }

  get _httpStatus() {
    return STATUS_CODES[this._httpStatusCode]
  }

  get _httpStatusCode() {
    return this._error.httpStatusCode || 500
  }

  get isInternalServerError() {
    return this._httpStatusCode === 500
  }

  toJSON() {
    const attributes: any = {
      type: this._type,
      code: this._code,
      message: this.message,
      context: this._context,
      httpStatus: this._httpStatus,
      httpStatusCode: this._httpStatusCode,
    }

    if (this.isInternalServerError) {
      attributes.stack = this.stack
    }

    const isPlainObject = !(this._originalError instanceof Error)
    const { isOperationError } = this._originalError

    if (isOperationError || isPlainObject) {
      attributes.originalError = this._originalError
    } else {
      attributes.originalError = pick(this._originalError, ['name', 'stack', 'message'])
    }

    // if (isProductionModeEnabled) {
    //   delete attributes.stack
    //   delete attributes.originalError
    // }

    return attributes
  }

  static buildOperationErrorClassSync(path: string): any {
    const { errors } = loadYaml(path)

    return class extends OperationError {
      constructor(code: any, context = {}, originalError = {}) {
        if (errors[code]) {
          const error = { ...errors[code], code }
          super(error, context, originalError)
        } else {
          super(code, context, originalError)
        }
      }
    }
  }

  static get errors(): any {
    return {
      'COM-0': {
        type: 'ApplicationError',
        message: 'There was an unhandled operation error.',
        httpStatusCode: 500,
      },
      'COM-1': {
        type: 'ApplicationError',
        message: 'An internal request failed.',
        httpStatusCode: 500,
      },
      'COM-2': {
        message: 'Requested document not found.',
        httpStatusCode: 404,
      },
      'COM-3': {
        type: 'InvalidParametersError',
        message: 'Invalid operation parameters.',
        httpStatusCode: 400,
      },
      'COM-4': {
        type: 'InvalidRequestError',
        message: "Can't read request body.",
        httpStatusCode: 400,
      },
      'COM-5': {
        type: 'InvalidRequestError',
        message: 'Request body is not a valid JSON.',
        httpStatusCode: 400,
      },
      'COM-6': {
        type: 'InvalidRequestError',
        message: 'API KEY must be provided.',
        httpStatusCode: 401,
      },
      'COM-7': {
        type: 'InvalidRequestError',
        message: 'API KEY not found.',
        httpStatusCode: 401,
      },
      'TST-0': {
        type: 'TestError',
        message: 'Operation request mock was not found or has already been resolved.',
        httpStatusCode: 500,
      },
    }
  }

  static renderMessage(message: string, context: any) {
    const templateVariables = (message.match(/{{(.*?)}}/g) || []).map((x) =>
      x.replace('{{', '').replace('}}', ''),
    )

    for (const templateVariable of templateVariables) {
      const isIncluded = context[templateVariable]
      const regex = new RegExp(`{{${templateVariable}}}`, 'g')

      if (isIncluded) {
        message = message.replace(regex, context[templateVariable])
      } else {
        message = message.replace(regex, OperationError.undefinedContextVariable)
      }
    }

    return message
  }

  static get undefinedContextVariable() {
    return 'UNDEFINED'
  }
}
