import nock from 'nock'
import { expect } from 'chai'
import ApiService from '../../../src/shared/apiService'
import { ApiOperationError } from '../../../src/shared/apiOperationError'
import cloudWalletApiSpec from './_cloud-wallet-api.json'

describe('ApiService', () => {
  const url = 'http://example-cloud-wallet-api.com'
  const apiService = new ApiService({
    'cloud-wallet-api': { url, rawSpec: cloudWalletApiSpec },
  })
  const apiKey = '4de400a5d27f76c1be8cf644b00d3f9616397ef9e55c770d78e1fd8fb7bbf9bc'

  afterEach(() => {
    nock.cleanAll()
  })

  describe('cloud-wallet-api', () => {
    describe('cloud-wallet-api.Login', () => {
      it('should login', async () => {
        // Arrange
        const username = 'yigitcan'
        const password = 'yigitcan'

        const expectedBody = { username, password }
        const response = { accessToken: 'your-access-token' }
        const expectedResponse = { body: response, status: 200 }

        const scope = nock(url)
          .post('/api/v1/users/login', expectedBody)
          .matchHeader('Api-Key', apiKey)
          .reply(200, response)

        // Act
        const options = { apiKey, params: { username, password } }
        const result = await apiService.execute('cloud-wallet-api.Login', options)

        // Assert
        expect(result).to.deep.equal(expectedResponse)
        expect(scope.isDone()).to.be.true
      })

      it('should throw user not found error', async () => {
        // Arrange
        const username = 'yigitcan'
        const password = 'yigitcan'

        const expectedBody = { username, password }
        const expectedError = new ApiOperationError('COR-4', { username }, 404, 'User not found.')

        const scope = nock(url)
          .post('/api/v1/users/login', expectedBody)
          .matchHeader('Api-Key', apiKey)
          .reply(404, {
            code: 'COR-4',
            message: 'User not found.',
            context: {
              username: 'yigitcan',
            },
            originalError: {},
            httpStatusCode: 404,
          })

        // Act
        const options = { apiKey, params: { username, password } }

        try {
          await apiService.execute('cloud-wallet-api.Login', options)
          // Assert
          throw new Error('promise resolved')
        } catch (err) {
          expect(err.message).to.equal(expectedError.message)
        }

        // Assert
        expect(scope.isDone()).to.be.true
      })

      it('should throw unknown error', async () => {
        // Arrange
        const username = 'yigitcan'
        const password = 'yigitcan'

        const expectedBody = { username, password }
        const expectedError = new Error('unknown response: {"hello":"world"}')

        const scope = nock(url)
          .post('/api/v1/users/login', expectedBody)
          .matchHeader('Api-Key', apiKey)
          .reply(404, { hello: 'world' })

        // Act
        const options = { apiKey, params: { username, password } }

        try {
          await apiService.execute('cloud-wallet-api.Login', options)
          // Assert
          throw new Error('promise resolved')
        } catch (err) {
          expect(err.message).to.equal(expectedError.message)
        }

        expect(scope.isDone()).to.be.true
      })
    })

    describe('SignUp', () => {
      it('should sign up', async () => {
        // Arrange
        const username = 'yigitcan'
        const password = 'yigitcan'
        const authorization = 'your-authorization'

        const expectedBody = { username, password }
        const response = { accessToken: 'your-access-token' }
        const expectedResponse = { body: response, status: 200 }

        const scope = nock(url)
          .post('/api/v1/users/signup', expectedBody)
          .matchHeader('Api-Key', apiKey)
          .matchHeader('Authorization', authorization)
          .reply(200, response)

        // Act
        const options = { apiKey, authorization, params: { username, password } }
        const result = await apiService.execute('cloud-wallet-api.SignUp', options)

        // Assert
        expect(result).to.deep.equal(expectedResponse)
        expect(scope.isDone()).to.be.true
      })

      it('should throw invalid request', async () => {
        // Arrange
        const username = 'yigit'
        const password = 'yigit'

        const expectedBody = { username, password }
        const expectedError = new ApiOperationError(
          'COR-1',
          {
            errors: [
              {
                message: 'Parameter "yigitcan" is not a password. Valid format: (/^.{6,}$/).',
                value: 'yigit',
              },
            ],
          },
          400,
          'Invalid operation parameters.',
        )

        const scope = nock(url)
          .post('/api/v1/users/signup', expectedBody)
          .matchHeader('Api-Key', apiKey)
          .reply(400, {
            code: 'COR-1',
            message: 'Invalid operation parameters.',
            context: {
              errors: [
                {
                  value: 'yigit',
                  message: 'Parameter "yigitcan" is not a password. Valid format: (/^.{6,}$/).',
                },
              ],
            },
            originalError: {},
            httpStatusCode: 400,
          })

        // Act
        const options = { apiKey, params: { username, password } }

        try {
          await apiService.execute('cloud-wallet-api.SignUp', options)
          // Assert
          throw new Error('promise resolved')
        } catch (err) {
          expect(err.message).to.equal(expectedError.message)
        }

        // Assert
        expect(scope.isDone()).to.be.true
      })

      it('should throw unknown error', async () => {
        // Arrange
        const username = 'yigitcan'
        const password = 'yigitcan'

        const expectedBody = { username, password }
        const expectedError = new Error('unknown response: {"hello":"world"}')

        const scope = nock(url)
          .post('/api/v1/users/signup', expectedBody)
          .matchHeader('Api-Key', apiKey)
          .reply(404, { hello: 'world' })

        // Act
        const options = { apiKey, params: { username, password } }

        try {
          await apiService.execute('cloud-wallet-api.SignUp', options)
          // Assert
          throw new Error('promise resolved')
        } catch (err) {
          expect(err.message).to.equal(expectedError.message)
        }

        // Assert
        expect(scope.isDone()).to.be.true
      })
    })
  })
})
