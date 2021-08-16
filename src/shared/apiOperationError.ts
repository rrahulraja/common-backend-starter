export class ApiOperationError extends Error {
  constructor(
    public readonly code: string,
    public readonly context: any,
    public readonly status: number,
    public readonly message: string,
  ) {
    super(message ?? code)
    this.name = 'ApiOperationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
