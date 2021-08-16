import { Request, Response, NextFunction } from 'express'

export interface ExtendedRequest extends Request {
  context: any
}

export default function contextMiddleware(context: any): any {
  return function (request: ExtendedRequest, response: Response, next: NextFunction): void {
    request.context = context

    next()
  }
}
