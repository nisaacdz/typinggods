import express, { Express } from "express"
import Env from "./config/app.keys"
import AppRoutes from "./routes/app.routes"

class App {
  public app: Express
  private appRoutes: AppRoutes

  constructor() {
    this.app = express()
    this.appRoutes = new AppRoutes(this.app)
    this.plugInMiddlewares()
    this.plugInRoutes()
  }

  private plugInMiddlewares() {
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))
  }

  private plugInRoutes() {
    this.app.get("/", (_req, res) => {
      res.status(200).send("<h1>Successful</h1>")
    })
    this.app.get(Env.API_PATH + "/health", (req, res) => {
      const response = "Server is health___  " + new Date().toUTCString()
      res.status(200).send(response)
    })
    this.appRoutes.initializeRoutes()
    this.app.all("*", (_req, res) => {
      res.status(404).send("RESOURCE NOT FOUND")
    })
  }
}

export default new App().app
