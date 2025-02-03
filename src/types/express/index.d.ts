import Express from "express"

declare global {
  namespace Express {
    interface Request {
      user?: Record<string, any>
    }
  }
}

// https://stackoverflow.com/questions/65848442/property-user-does-not-exist-on-type-requestparamsdictionary-any-any-pars
