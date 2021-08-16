import { Request, Response, NextFunction } from 'express'

const allowedMethods = new Set(['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'])

export const NotAllowedError = {
  code: 405,
  message: 'Method Not Allowed',
  originalError: '',
  _httpStatusCode: 405,
}

export function blockUnusedMethods(req: Request, res: Response, next: NextFunction): void {
  if (!allowedMethods.has(req.method)) {
    throw NotAllowedError
  }

  next()
}
