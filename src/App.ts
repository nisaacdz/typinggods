import express from "express";
import Env from "./config/app.keys";
import { initializeRoutes } from "./routes/app.routes";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { getCurrentUser } from "./services/auth.service";
import initializeSockets from "./sockets";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const user = getCurrentUser(token);
    if (!user) {
      throw new Error("Authentication failed");
    }
    socket.user = user;
    next();
  } catch (error: any) {
    next(error instanceof Error ? error : new Error("Authentication failed"));
  }
});

initializeSockets(io);

app.use((req, _, next) => {
  req.io = io;
  next();
});

app.get("/", (_req, res) => {
  res.status(200).send("<h1>Successful</h1>");
});

app.get(Env.API_PATH + "/health", (_req, res) => {
  const response = "Server is healthy___  " + new Date().toUTCString();
  res.status(200).send(response);
});

initializeRoutes(app);

app.all("*", (_req, res) => {
  res.status(404).send("RESOURCE NOT FOUND");
});

httpServer.listen(3000, () => {
  console.log("Server running on port 3000");
});

export default app;
