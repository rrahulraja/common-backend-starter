import cors from 'cors'

let allowedOrigins: string[] | boolean = true
let allowedMethods: string[] = []
let allowedHeaders: string[] = []

const { CORS_ALLOWED_ORIGINS, CORS_ALLOWED_METHODS, CORS_ALLOWED_HEADERS } = process.env

if (CORS_ALLOWED_ORIGINS !== 'true' && CORS_ALLOWED_ORIGINS && CORS_ALLOWED_ORIGINS.length) {
  allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',')
}

if (CORS_ALLOWED_METHODS && CORS_ALLOWED_METHODS.length) {
  allowedMethods = process.env.CORS_ALLOWED_METHODS.split(',')
}

if (CORS_ALLOWED_HEADERS && CORS_ALLOWED_HEADERS.length) {
  allowedHeaders = process.env.CORS_ALLOWED_HEADERS.split(',')
}

export default cors({
  optionsSuccessStatus: 200,
  origin: allowedOrigins,
  methods: allowedMethods,
  allowedHeaders,
})
