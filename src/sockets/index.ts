import { DefaultEventsMap, Server } from "socket.io";
import {
  enterTypingZone,
  getTypingZoneData,
  processUserTyping,
} from "../services/typing.service";

export default function initializeSockets(
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    const user = socket.user!;

    socket.on("enterTypingZone", async (challengeId) => {
      let zone = await enterTypingZone(user.userId, challengeId);
      if (!zone) {
        return socket.emit("error", "Failed to enter typing zone");
      }
      const zoneData = await getTypingZoneData(challengeId, user.userId);
      socket.join(zone.sessionId);
      io.to(zone.sessionId).emit("update", zoneData);
    });

    socket.on("onType", async (data) => {
      const { challengeId, letters } = data;
      const userSession = await processUserTyping(
        challengeId,
        user.userId,
        letters,
      );
      const zoneData = await getTypingZoneData(challengeId, user.userId);
      io.to(userSession.sessionId).emit("update", zoneData);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}
