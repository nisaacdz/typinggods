import { Express } from "express"

class AppRoutes {
  app: Express

  constructor(app: Express) {
    this.app = app
  }

  initializeRoutes() {}
}

export default AppRoutes
