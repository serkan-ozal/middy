const { normalizeHttpResponse } = require('@middy/util')

// Code and Defaults heavily based off https://helmetjs.github.io/

const defaults = {
  // contentDisposition: {
  //   filename: undefined
  // },
  dnsPrefetchControl: {
    allow: false
  },
  expectCT: {
    enforce: true,
    maxAge: 30,
    reportUri: ''
  },
  frameguard: {
    action: 'deny'
  },
  hidePoweredBy: {
    setTo: null
  },
  hsts: {
    maxAge: 180 * 24 * 60 * 60,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: {
    action: 'noopen'
  },
  noSniff: {
    action: 'nosniff'
  },
  permittedCrossDomainPolicies: {
    policy: 'none' // none, master-only, by-content-type, by-ftp-filename, all
  },
  referrerPolicy: {
    policy: 'no-referrer'
  },
  xssFilter: {
    reportUri: ''
  }
}

const helmet = {}
const helmetHtmlOnly = {}

// OWASP ASVS 14.4.2
// API Gateway strips out this header :(
// helmet.content = (headers, config) => {
//   const filename = config.filename ?? `api.${headers?.['Content-Type'].split(/[/;]/)[1] ?? 'json'}`
//   headers['Content-Disposition'] = `attachment; filename="${filename}"`
// }

// contentSecurityPolicy - N/A - no HTML
// featurePolicy - N/A - no HTML

// crossdomain - N/A - For Adobe products

// https://github.com/helmetjs/dns-Prefetch-control
helmet.dnsPrefetchControl = (headers, config) => {
  headers['X-DNS-Prefetch-Control'] = config.allow ? 'on' : 'off'
  return headers
}

// expectCt - in-progress spec

// https://github.com/helmetjs/frameguard
helmetHtmlOnly.frameguard = (headers, config) => {
  headers['X-Frame-Options'] = config.action.toUpperCase()
  return headers
}

// https://github.com/helmetjs/hide-powered-by
helmet.hidePoweredBy = (headers, config) => {
  if (config.setTo) {
    headers['X-Powered-By'] = config.setTo
  } else {
    Reflect.deleteProperty(headers, 'Server')
    Reflect.deleteProperty(headers, 'X-Powered-By')
  }
  return headers
}

// hpkp - deprecated

// https://github.com/helmetjs/hsts
helmet.hsts = (headers, config) => {
  let header = 'max-age=' + Math.round(config.maxAge)
  if (config.includeSubDomains) {
    header += '; includeSubDomains'
  }
  if (config.preload) {
    header += '; preload'
  }
  headers['Strict-Transport-Security'] = header
  return headers
}

// https://github.com/helmetjs/ienoopen
helmet.ieNoOpen = (headers, config) => {
  headers['X-Download-Options'] = config.action
  return headers
}

// noCache - N/A - separate middleware

// https://github.com/helmetjs/dont-sniff-mimetype
helmet.noSniff = (headers, config) => {
  headers['X-Content-Type-Options'] = config.action
  return headers
}

// https://github.com/helmetjs/referrer-policy
helmet.referrerPolicy = (headers, config) => {
  headers['Referrer-Policy'] = config.policy
  return headers
}

// https://github.com/helmetjs/crossdomain
helmet.permittedCrossDomainPolicies = (headers, config) => {
  headers['X-Permitted-Cross-Domain-Policies'] = config.policy
  return headers
}

// https://github.com/helmetjs/x-xss-protection
helmetHtmlOnly.xssFilter = (headers, config) => {
  let header = '1; mode=block'
  if (config.reportUri) {
    header += '; report=' + config.reportUri
  }
  headers['X-XSS-Protection'] = header
  return headers
}

const httpSecurityHeadersMiddleware = (opts = {}) => {
  const options = { ...defaults, ...opts }

  const httpSecurityHeadersMiddlewareAfter = async (request) => {
    request.response = normalizeHttpResponse(request.response)

    Object.keys(helmet).forEach((key) => {
      const config = { ...defaults[key], ...options[key] }
      request.response.headers = helmet[key](request.response.headers, config)
    })

    if (request.response.headers?.['Content-Type']?.includes('text/html')) {
      Object.keys(helmetHtmlOnly).forEach((key) => {
        const config = { ...defaults[key], ...options[key] }
        request.response.headers = helmetHtmlOnly[key](
          request.response.headers,
          config
        )
      })
    }
  }

  const httpSecurityHeadersMiddlewareOnError = httpSecurityHeadersMiddlewareAfter

  return {
    after: httpSecurityHeadersMiddlewareAfter,
    onError: httpSecurityHeadersMiddlewareOnError
  }
}
module.exports = httpSecurityHeadersMiddleware
