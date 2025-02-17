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
import { getCurrentUser, login } from "./services/auth";

const appService = new AppService(db);
const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

// Session configuration
app.use(sessionMiddleware);

// Public routes
app.get("/", (_req, res) => {
  res.status(200).send("<h1>Welcome</h1>");
});

app.get(Env.API_PATH + "/health", (_req, res) => {
  const response = "Server is healthy___  " + new Date().toUTCString();
  res.status(200).send(response);
});

// Example login route
app.post("/login", async (req, res) => {
  try {
    const { password, username } = req.body;
    const user = await login(password, username);
    if (!user || !req.session) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.session.user = user;
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Apply authentication to protected routes
app.use("/", async (req, res, next) => {
  let user = getCurrentUser(req.session);
  if (!user) {
    user = await login("password", "username");
    req.session!.user = user;
  }
  next();
});

// Initialize your routes
initializeRoutes(app, appService);

const httpServer = createServer(app);

// Socket.io setup with session support
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// Share session middleware with Socket.IO
io.engine.use(sessionMiddleware);

// Authentication middleware
io.use(async (socket, next) => {
  const user = getCurrentUser(socket.request.session);
  if (user) {
    return next();
  } else if (socket.request.session) {
    socket.request.session.user = await login("password", "username");
    return next();
  } else {
    return next(new Error("Authentication error"));
  }
});

initializeSockets(io, appService);

// 404 handler
app.all("*", (_req, res) => {
  res.status(404).send("RESOURCE NOT FOUND");
});

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something broke!" });
  },
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
