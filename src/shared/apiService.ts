import fetch from 'node-fetch'
import { ApiOperationError } from './apiOperationError'

export default class ApiService {
  private readonly _specs: Record<string, { url: string; spec: any }> = {}

  constructor(options: ApiServiceOptions) {
    this._specs = ApiService._parseSpecs(options)
  }

  public async execute(serviceOperation: string, options: APIOptions = {}): Promise<APIResponse> {
    if (!options.url) {
      const [serviceName, operationId] = serviceOperation.split('.')

      const serviceSpec = this._specs[serviceName]
      const operation = serviceSpec?.spec[operationId]

      if (!operation) {
        throw new Error(`unknown operation ${operationId} for ${serviceName} service`)
      }

      const { method, path } = operation

      options.url = `${serviceSpec.url}${path}`
      options.method = method
    }

    options.headers = options.headers || {}
    options.headers['Accept'] = 'application/json'
    options.headers['Content-Type'] = 'application/json'
    options.headers['Api-Key'] = options.apiKey
    if (options.authorization) {
      options.headers['Authorization'] = options.authorization
    }

    if (options.params) {
      let { params: body } = options

      body = JSON.stringify(body, null, 2)
      ;(options as any).body = body
    }

    const { url } = options

    delete options.params
    delete options.url

    const response = await fetch(url, options)
    const { status } = response

    if (status === 204) {
      return { body: {}, status }
    }

    let jsonResponse

    if (status.toString().startsWith('2')) {
      jsonResponse = await response.json()
    } else {
      const error = await response.json()

      const { code, message, context } = error

      if (code) {
        throw new ApiOperationError(code, context, status, message)
      }

      throw new Error('unknown response: ' + JSON.stringify(error))
    }

    return { body: jsonResponse, status }
  }

  private static _parseSpecs(options: ApiServiceOptions) {
    return Object.keys(options).reduce((acc, serviceName) => {
      const { url, rawSpec } = options[serviceName]
      const spec = ApiService._parseSpec(rawSpec)
      return { ...acc, [serviceName]: { url, spec } }
    }, {})
  }

  private static _parseSpec(rawSpec: any): any {
    const spec: any = {}
    const basePath = rawSpec.servers[0].url

    for (const operationPath in rawSpec.paths) {
      const operation = rawSpec.paths[operationPath]
      const path = `${basePath}${operationPath}`

      for (const method in operation) {
        const { operationId } = operation[method]

        spec[operationId] = {
          path,
          method,
          operationId,
        }
      }
    }

    return spec
  }
}

type ApiServiceOptions = {
  [key: string]: {
    url: string
    rawSpec: any
  }
}

type APIOptions = {
  url?: string
  method?: string
  headers?: { [key: string]: string }
  params?: any
  apiKey?: string
  authorization?: string
}

type APIResponse = {
  body: any
  status: number
}
