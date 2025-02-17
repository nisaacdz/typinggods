import { Server, Socket } from "socket.io";
import { AppService } from "../services/index.service";
import {
  Challenge,
  TypingSession,
  UserChallengeStatus,
} from "../db/schema/db.schema";

const BatchUserUpdateInterval = 80;
const BatchRoomUpdateInterval = 240;
const BatchUserUpdateLength = 5;
const BatchRoomUpdateLength = 16;

const scheduledChallenges = new Set<string>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const scheduleTypingChallengeStart = async (
  challengeId: string,
  appService: AppService,
  io: Server,
) => {
  if (scheduledChallenges.has(challengeId)) return;

  const challenge =
    await appService.challengeService.getChallengeById(challengeId);
  if (!challenge || challenge.startedAt) return;

  const startIn = Math.max(challenge.scheduledAt.getTime() - Date.now(), 0);

  scheduledChallenges.add(challengeId);

  let startedChallenge: Challenge | null = null;

  try {
    await delay(startIn);
    startedChallenge = await appService.challengeService.updateChallenge(
      challengeId,
      {
        startedAt: new Date(),
      },
    );
  } finally {
    scheduledChallenges.delete(challengeId);
  }

  return startedChallenge;
};

const updateUserTypingSession = (
  typingSession: TypingSession,
  inputString: string,
  challengeText: string,
  appService: AppService,
  socket: Socket,
) => {
  const now = Date.now();
  const elapsedTime = now - typingSession.startTime!.getTime();

  for (
    let inputIndex = 0;
    inputIndex < inputString.length &&
    typingSession.correctPosition < challengeText.length;
    inputIndex++
  ) {
    const currentChar = inputString[inputIndex];
    if (currentChar === "\b") {
      if (typingSession.currentPosition > typingSession.correctPosition) {
        typingSession.currentPosition--;
      } else if (
        typingSession.currentPosition === typingSession.correctPosition
      ) {
        if (
          typingSession.currentPosition > 0 &&
          challengeText[typingSession.currentPosition - 1] !== " "
        ) {
          typingSession.currentPosition--;
          typingSession.correctPosition--;
        }
      }
    } else {
      typingSession.totalKeystrokes++;

      if (typingSession.currentPosition >= challengeText.length) continue;

      if (
        typingSession.correctPosition === typingSession.currentPosition &&
        currentChar === challengeText[typingSession.currentPosition]
      ) {
        // Correct character
        typingSession.correctPosition++;
        typingSession.currentPosition++;
      } else {
        // Incorrect character
        typingSession.currentPosition++;
      }
    }
  }

  if (
    typingSession.correctPosition >= challengeText.length &&
    !typingSession.endTime
  ) {
    typingSession.endTime = new Date(now);
  }

  const minutesElapsed = elapsedTime / 60000;

  typingSession.wpm =
    minutesElapsed > 0
      ? Math.round(typingSession.correctPosition / 5 / minutesElapsed)
      : 0;
  typingSession.accuracy =
    typingSession.totalKeystrokes === 0
      ? 100
      : Math.round(
          (typingSession.correctPosition / typingSession.totalKeystrokes!) *
            100,
        );

  appService.typingService
    .updateSessionProgress(typingSession.sessionId, {
      endTime: typingSession.endTime,
      wpm: typingSession.wpm,
      accuracy: typingSession.accuracy,
      totalKeystrokes: typingSession.totalKeystrokes,
      correctPosition: typingSession.correctPosition,
      currentPosition: typingSession.currentPosition,
    })
    .then((_) => {
      socket.emit("user-update", typingSession);
    })
    .catch((error: any) => {
      socket.emit("error", error.message);
    });
};

const updateChallengeRoom = async (
  challengeId: string,
  appService: AppService,
  io: Server,
) => {
  try {
    const participantUpdates =
      await appService.challengeService.getChallengeParticipants(challengeId);
    io.to(challengeId).emit("room-update", participantUpdates);
  } catch (error) {
    console.error("Error updating challenge room:", error);
  }
};

export default function initializeSockets(io: Server, appService: AppService) {
  io.on("connection", async (socket) => {
    const user = socket.request.session?.user;
    if (!user?.userId) {
      socket.emit("error", "Unauthorized");
      return socket.disconnect(true);
    }

    let enteredChallenge: Challenge | null = null;
    let enteredTypingSession: TypingSession | null = null;
    let typedText = "";
    let userUpdateTimeout: NodeJS.Timeout | null = null;
    let roomUpdateTimeout: NodeJS.Timeout | null = null;

    try {
      const userChallenge = await appService.challengeService.getCurrentUserChallenge(
        user.userId,
      );
      if (!userChallenge) {
        socket.emit("error", "User Challenge not found");
        return socket.disconnect(true);
      }

      enteredChallenge = await appService.challengeService.getChallengeById(
        userChallenge.challengeId,
      );
      
      if (!enteredChallenge) {
        socket.emit("error", "Challenge not found");
        return socket.disconnect(true);
      }

      const participant =
        await appService.challengeService.getChallengeParticipant(
          enteredChallenge.challengeId,
          user.userId,
        );
      socket.join(enteredChallenge.challengeId);
      io.to(enteredChallenge.challengeId).emit("entered", participant);
      await updateChallengeRoom(enteredChallenge.challengeId, appService, io);
      enteredTypingSession =
        await appService.typingService.getOrCreateTypingSession(
          user.userId,
          enteredChallenge.challengeId,
        );
      scheduleTypingChallengeStart(
        enteredChallenge.challengeId,
        appService,
        io,
      ).then(async (startedChallenge) => {
        if (!startedChallenge) return;
        enteredChallenge = startedChallenge;
        io.to(enteredChallenge.challengeId).emit(
          "start-challenge",
          enteredChallenge.text,
        );
        await updateChallengeRoom(enteredChallenge.challengeId, appService, io);
      });
    } catch (error) {
      socket.emit("error", "Initialization failed");
      return socket.disconnect(true);
    }

    socket.on("on-type", async (data) => {
      if (!enteredChallenge?.startedAt) {
        return socket.emit("error", "Challenge has not started yet");
      }

      try {
        if (!enteredTypingSession) {
          enteredTypingSession =
            await appService.typingService.getTypingSession(
              enteredChallenge.challengeId,
              user.userId,
            );

          if (!enteredTypingSession) {
            return socket.emit("error", "Failed to initialize typing session");
          }
        }

        if (enteredTypingSession.endTime) {
          return socket.emit("error", "You have already finished the race");
        }

        enteredTypingSession.startTime =
          enteredTypingSession.startTime || new Date();

        const { character } = data;
        if (typeof character !== "string" || character.length > 1) {
          return console.warn("Invalid character input:", character);
        }

        typedText += character;

        if (typedText.length >= BatchUserUpdateLength || !userUpdateTimeout) {
          const inputString = typedText;
          typedText = "";

          if (userUpdateTimeout) clearTimeout(userUpdateTimeout);

          userUpdateTimeout = setTimeout(async () => {
            try {
              updateUserTypingSession(
                enteredTypingSession!,
                inputString,
                enteredChallenge!.text,
                appService,
                socket,
              );

              if (
                enteredTypingSession!.correctPosition >=
                enteredChallenge!.text.length
              ) {
                await appService.challengeService.updateChallengeStatus(
                  user.userId,
                  enteredChallenge!.challengeId,
                  UserChallengeStatus.Completed,
                );
                await updateChallengeRoom(
                  enteredChallenge!.challengeId,
                  appService,
                  io,
                );
              }
            } finally {
              userUpdateTimeout = null;
            }
          }, BatchUserUpdateInterval);
        }

        if (typedText.length >= BatchRoomUpdateLength || !roomUpdateTimeout) {
          if (roomUpdateTimeout) clearTimeout(roomUpdateTimeout);

          roomUpdateTimeout = setTimeout(async () => {
            try {
              await updateChallengeRoom(
                enteredChallenge!.challengeId,
                appService,
                io,
              );
            } finally {
              roomUpdateTimeout = null;
            }
          }, BatchRoomUpdateInterval);
        }
      } catch (error) {
        socket.emit("error", "Failed to process input");
        console.error("Typing error:", error);
      }
    });

    socket.on("leave-challenge", async () => {
      try {
        if (!enteredChallenge) return;

        socket.leave(enteredChallenge.challengeId);

        if (enteredTypingSession) {
          await appService.typingService.exitSession(
            enteredTypingSession.sessionId,
            user.userId,
          );
        }

        await appService.challengeService.updateChallengeStatus(
          user.userId,
          enteredChallenge.challengeId,
          UserChallengeStatus.Abandoned,
        );

        const participant =
          await appService.challengeService.getChallengeParticipant(
            enteredChallenge.challengeId,
            user.userId,
          );

        io.to(enteredChallenge.challengeId).emit("left", participant);
        await updateChallengeRoom(enteredChallenge.challengeId, appService, io);
      } finally {
        enteredChallenge = null;
        enteredTypingSession = null;
      }
    });

    socket.on("disconnect", async () => {
      if (enteredChallenge) {
        const participant =
          await appService.challengeService.getChallengeParticipant(
            enteredChallenge?.challengeId,
            user.userId,
          );
        socket.emit("left", participant);
      }
      if (userUpdateTimeout) clearTimeout(userUpdateTimeout);
      if (roomUpdateTimeout) clearTimeout(roomUpdateTimeout);
    });
  });
}
