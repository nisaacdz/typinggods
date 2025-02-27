import express from "express";
import session from "express-session";
import Env from "./config/app.keys";
import { initializeRoutes } from "./routes/app.routes";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import initializeSockets from "./sockets";
import { AppService } from "./services/index.service";
import { db } from "./db";
import { getCurrentUser } from "./services/auth";
import AuthRoutes from "./routes/auth.routes";

const appService = new AppService(db);
const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
});

app.use(sessionMiddleware);

app.get("/", (_req, res) => {
  res.status(200).send("<h1>Welcome</h1>");
});

app.get(Env.API_PATH + "/health", (_req, res) => {
  const response = "Server is healthy___  " + new Date().toUTCString();
  res.status(200).send(response);
});

app.use("/auth", AuthRoutes);

app.use("/", async (req, res, next) => {
  let user = getCurrentUser(req.session);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

initializeRoutes(app, appService);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

io.engine.use(sessionMiddleware);

io.use(async (socket, next) => {
  const user = getCurrentUser(socket.request.session);
  if (!user) {
    return console.log("wierd, something not right!");
  }
  next();
});

initializeSockets(io, appService);

app.all("*", (_req, res) => {
  res.status(404).send("RESOURCE NOT FOUND");
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something broke!" });
  }
);

if (process.env.NODE_ENV !== "production") {
  const router = app._router as express.Router;
  router.stack.forEach((layer: any) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods);
      if (methods.length > 0) {
        const method = methods[0].toUpperCase();
        const path = layer.route.path;
        console.log(`  ${method} ${path}`);
      }
    }
  });
}

export default httpServer;
