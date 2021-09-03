import nock from 'nock'
import { expect } from 'chai'
import httpMocks from 'node-mocks-http'
import { errorMiddleware } from '../../src/middlewares'
import maskedResponseJson from './middlewares/_expectedResponse.json'
import contextJson from './middlewares/_context.json'
import inputParamsJson from './middlewares/_inputParams.json'

describe('errorMiddleware', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  describe('filteringSensitiveData', () => {
    it('should filter', async () => {
      // Arrange
      const error = {
        code: 'COR-5',
        message: 'Confirmation code is invalid.',
        httpStatusCode: 400,
        context: contextJson,
        originalError: {},
      }
      const request = httpMocks.createRequest({
        method: 'POST',
        url: '/api/v1/users/forgot-password/confirm',
        body: inputParamsJson,
      })
      const response = httpMocks.createResponse()

      // Act
      const middleware = errorMiddleware('test')
      middleware(error, request, response, null)

      // Assert
      expect(response._getData()).to.be.deep.equal(maskedResponseJson)
    })
  })
})
