import { Request, Response, NextFunction } from 'express'

export default function healthMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (request.path === '/health') {
    const ROOT_PATH = process.cwd()
    const { name, version } = require(`${ROOT_PATH}/package.json`)
    const serviceStatus = { status: 'Ok', name, version }
    response.send(serviceStatus)
  }

  next()
}
