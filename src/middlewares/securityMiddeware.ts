import helmet from 'helmet'
import noCache from 'nocache'

export default function registerSecurityMiddleware(app: any) {
  app.use(noCache())
  app.use(
    helmet({
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
    }),
  )
}
