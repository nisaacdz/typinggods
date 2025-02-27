import { Server, Socket } from "socket.io";
import { AppService } from "../services/index.service";
import {
  Challenge,
  TypingSession,
  UserChallengeStatus,
  UserChallengeStatusType,
} from "../db/schema/db.schema";
import { getCurrentUser } from "../services/auth";

const MaxUserUpdateWaitDuration = 100;
const MaxUserUpdateInputLength = 5;
const EnterableUserChallengeStatuses: UserChallengeStatusType[] = [
  UserChallengeStatus.Accepted,
  UserChallengeStatus.Completed,
];

const scheduledChallenges = new Set<string>();
const startedChallenges: Record<string, Challenge> = {};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Improvement 1: Central error handler
const handleError = (socket: Socket, errorMessage: string) => {
  socket.emit("error", errorMessage);
  console.error(`Socket Error (${socket.id}): ${errorMessage}`);
};

// Improvement 3: Input validation helper
const isValidInput = (character: unknown): character is string => {
  return typeof character === "string" && character.length === 1;
};

enum ScheduleTypingResult {
  AlreadyStarted,
  AlreadyScheduled,
  Success,
  Failed,
}

const scheduleTypingChallengeStart = (
  enteredChallenge: Challenge,
  appService: AppService,
  io: Server,
) => {
  if (enteredChallenge.startedAt) return ScheduleTypingResult.AlreadyStarted;
  if (scheduledChallenges.has(enteredChallenge.challengeId))
    return ScheduleTypingResult.AlreadyScheduled;

  const startIn = Math.max(
    enteredChallenge.scheduledAt.getTime() - Date.now(),
    1000,
  );
  scheduledChallenges.add(enteredChallenge.challengeId);

  (async () => {
    try {
      await delay(startIn);
      const startedChallenge =
        await appService.challengeService.startUnstartedChallenge(
          enteredChallenge.challengeId,
        );

      if (!startedChallenge || !startedChallenge.startedAt) {
        throw new Error("Failed to start challenge");
      }

      startedChallenges[enteredChallenge.challengeId] = startedChallenge;

      const participants =
        await appService.challengeService.getChallengeParticipants(
          startedChallenge.challengeId,
        );

      io.to(startedChallenge.challengeId).emit("start-challenge", {
        challengeId: startedChallenge.challengeId,
        typingText: startedChallenge.text,
        participants,
      });
    } catch (err) {
      io.to(enteredChallenge.challengeId).emit(
        "error",
        "Challenge failed to start",
      );
      console.error("Scheduling error:", err);
    } finally {
      scheduledChallenges.delete(enteredChallenge.challengeId);
    }
  })();

  return ScheduleTypingResult.Success;
};

const updateUserTypingSession = (
  typingSession: TypingSession,
  inputString: string,
  challengeText: string,
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
};

export default function initializeSockets(io: Server, appService: AppService) {
  io.on("connection", (socket) => {
    const user = getCurrentUser(socket.request.session);
    if (!user) {
      handleError(socket, "Unauthorized");
      return socket.disconnect(true);
    }

    let enteredChallenge: Challenge | null = null;
    let enteredTypingSession: (TypingSession & { username: string }) | null =
      null;
    let typedText = "";
    let userUpdateTimeout: NodeJS.Timeout | null = null;

    const asyncHandler = (handler: Function) => {
      return (...args: any[]) => {
        handler(...args).catch((err: Error) =>
          handleError(socket, err.message),
        );
      };
    };

    socket.on(
      "enter-challenge",
      asyncHandler(async ({ challengeId }: { challengeId: string }) => {
        const userChallenge =
          await appService.challengeService.getUserChallengeByIds(
            user.userId,
            challengeId,
          );

        if (
          !userChallenge ||
          !EnterableUserChallengeStatuses.includes(userChallenge.status)
        ) {
          throw new Error("Cannot enter challenge");
        }

        enteredChallenge =
          await appService.challengeService.getChallengeById(challengeId);

        if (!enteredChallenge) {
          throw new Error("Challenge not found");
        }

        const userSession =
          await appService.typingService.getOrCreateTypingSession(
            user.userId,
            enteredChallenge.challengeId,
          );

        if (!userSession) {
          throw new Error("Failed to create typing session");
        }

        enteredTypingSession = { ...userSession, username: user.username };
        socket.join(enteredChallenge.challengeId);
        io.to(enteredChallenge.challengeId).emit(
          "entered",
          enteredTypingSession,
        );

        const scheduleResult = scheduleTypingChallengeStart(
          enteredChallenge,
          appService,
          io,
        );

        switch (scheduleResult) {
          case ScheduleTypingResult.AlreadyStarted:
            const participants =
              await appService.challengeService.getChallengeParticipants(
                enteredChallenge.challengeId,
              );
            socket.emit("start-challenge", {
              // Changed to socket.emit
              challengeId: enteredChallenge.challengeId,
              typingText: enteredChallenge.text,
              participants,
            });
            break;
          case ScheduleTypingResult.Success:
            break;
          case ScheduleTypingResult.AlreadyScheduled:
            break;
        }
      }),
    );

    socket.on(
      "on-type",
      asyncHandler(async (data: { character: string }) => {
        if (!enteredTypingSession || !enteredChallenge) {
          throw new Error("No challenge entered");
        }

        if (!enteredChallenge.startedAt) {
          enteredChallenge =
            startedChallenges[enteredChallenge.challengeId] || enteredChallenge;
        }

        if (!enteredChallenge.startedAt) {
          throw new Error("Challenge has not started yet");
        }

        if (enteredTypingSession.endTime) {
          throw new Error("You have already finished the race");
        }

        const { character } = data;
        if (!isValidInput(character)) {
          throw new Error("Invalid character input");
        }

        enteredTypingSession.startTime ||= new Date();
        typedText += character;

        if (
          typedText.length >= MaxUserUpdateInputLength ||
          !userUpdateTimeout
        ) {
          const inputString = typedText;
          typedText = "";

          if (userUpdateTimeout) clearTimeout(userUpdateTimeout);

          userUpdateTimeout = setTimeout(async () => {
            updateUserTypingSession(
              enteredTypingSession!,
              inputString,
              enteredChallenge!.text,
            );

            io.to(enteredChallenge!.challengeId).emit(
              "user-update",
              enteredTypingSession,
            );

            if (
              enteredTypingSession!.correctPosition >=
              enteredChallenge!.text.length
            ) {
              await appService.typingService.updateSessionProgress(
                enteredTypingSession!.sessionId,
                enteredTypingSession!,
              );
              await appService.challengeService.updateChallengeStatus(
                user.userId,
                enteredChallenge!.challengeId,
                UserChallengeStatus.Completed,
              );
            }
            userUpdateTimeout = null;
          }, MaxUserUpdateWaitDuration);
        }
      }),
    );

    socket.on(
      "leave-challenge",
      asyncHandler(async () => {
        if (!enteredChallenge) return;

        socket.leave(enteredChallenge.challengeId);
        if (enteredTypingSession) {
          await appService.typingService.deleteTypingSession(
            enteredTypingSession.sessionId,
          );
        }

        await appService.challengeService.updateChallengeStatus(
          user.userId,
          enteredChallenge.challengeId,
          UserChallengeStatus.Abandoned,
        );

        io.to(enteredChallenge.challengeId).emit("left", enteredTypingSession);
        enteredChallenge = null;
        enteredTypingSession = null;
      }),
    );

    socket.on("disconnect", async () => {
      (async () => {
        if (enteredTypingSession) {
          await appService.typingService.updateSessionProgress(
            enteredTypingSession.sessionId,
            enteredTypingSession,
          );
        }
      })().catch((err) => handleError(socket, err.message));
    });
  });
}
