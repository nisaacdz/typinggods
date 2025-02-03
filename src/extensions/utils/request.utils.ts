import { Request, Response, Router } from "express"

class RequestUtils {
  private router: Router
  private request!: Request
  private response!: Response

  constructor(router: Router) {
    this.router = router
    this.router.use((req, res, next) => {
      this.request = req
      this.response = res
      next()
    })
  }

  public addDataToState(key: string, data: any) {
    return (this.response.locals[key] = data)
  }

  public getDataFromState(key: string) {
    return this.response.locals[key] || null
  }

  public getRequestUser() {
    return this.response.locals.user as any
  }
}
export default RequestUtils
