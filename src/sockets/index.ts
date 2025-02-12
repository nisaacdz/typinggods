import { DefaultEventsMap, Server, Socket } from "socket.io";
import { AppService } from "../services/index.service";
import {
  Challenge,
  ChallengePrivacy,
  TypingSession,
  UserChallengeStatus,
} from "../db/schema/db.schema";

const BatchTypingUpdateInterval = 50;
const BatchChallengeRoomUpdateInterval = 200;
const BatchTypingTextLength = 5;
const BatchChallengeRoomTextLength = 20;

const updateUserTypingSession = (
  typingSession: TypingSession,
  inputString: string,
  challengeText: string,
  appService: AppService,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
) => {
  // allow modifying the typingSession
  const now = Date.now();
  const elapsedTime = now - typingSession.startTime.getTime();

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
        // Incorrect character (track error position)
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
      socket.emit("participant-update", typingSession);
    })
    .catch((error) => {
      socket.emit("error", "Failed to update typing session");
    });
};

const updateChallengeRoom = async (
  challengeId: string,
  appService: AppService,
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
) => {
  const participantUpdates =
    await appService.challengeService.getChallengeParticipants(challengeId);
  io.to(challengeId).emit("zone-update", participantUpdates);
};

export default function initializeSockets(
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  appService: AppService,
) {
  io.on("connection", (socket) => {
    // some session data needed for the user
    const user = socket.request.session?.user!;
    let enteredTypingSession: TypingSession | null = null;
    let enteredChallenge: Challenge | null = null;
    let typedText = "";
    let userUpdateTimeout: NodeJS.Timeout | null = null;
    let roomUpdateTimeout: NodeJS.Timeout | null = null;

    socket.on("enter-challenge", async (challengeId) => {
      let challenge =
        await appService.challengeService.getChallengeById(challengeId);
      if (!challenge) {
        return socket.emit("error", "Challenge not found");
      }

      if (
        challenge.scheduledAt.getTime() -
          appService.challengeService.challengeClosedWindow <
        Date.now()
      ) {
        return socket.emit(
          "error",
          "Challenge is no longer accepting participants",
        );
      }

      let userChallenge;
      if (challenge.privacy === ChallengePrivacy.Open) {
        userChallenge = await appService.challengeService.enterPublicChallenge(
          user.userId,
          challengeId,
        );
      } else if (challenge.privacy === ChallengePrivacy.Invitational) {
        userChallenge = await appService.challengeService.updateChallengeStatus(
          user.userId,
          challengeId,
          UserChallengeStatus.Accepted,
        );
      }

      if (!userChallenge) {
        return socket.emit("error", "Failed to enter typing zone");
      }

      enteredChallenge = challenge;

      const typingSession =
        await appService.typingService.getOrCreateTypingSession(
          user.userId,
          challengeId,
        );

      if (!typingSession) {
        return socket.emit("error", "Failed to enter typing zone");
      }

      enteredTypingSession = typingSession;

      const participants =
        await appService.challengeService.getChallengeParticipants(challengeId);
      socket.join(challenge.challengeId);
      io.to(challenge.challengeId).emit("entered", participants);
    });

    socket.on("on-type", async (data) => {
      const { character } = data;

      if (typeof character !== "string" || character.length > 1) {
        console.warn("Invalid character input:", character);
        return;
      }

      if (!enteredTypingSession) {
        return socket.emit("error", "You are not in a challenge");
      }

      typedText += character;

      if (!userUpdateTimeout || typedText.length >= BatchTypingTextLength) {
        const inputString = typedText;
        typedText = "";
        userUpdateTimeout = setTimeout(async () => {
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
            appService.challengeService.updateChallengeStatus(
              user.userId,
              enteredChallenge!.challengeId,
              UserChallengeStatus.Completed,
            );
          }
          userUpdateTimeout = null;
        }, BatchTypingUpdateInterval);
      }

      if (
        !roomUpdateTimeout ||
        typedText.length >= BatchChallengeRoomTextLength
      ) {
        roomUpdateTimeout = setTimeout(async () => {
          updateChallengeRoom(enteredChallenge!.challengeId, appService, io);
          roomUpdateTimeout = null;
        }, BatchChallengeRoomUpdateInterval);
      }
    });

    socket.on("leave-challenge", async () => {
      if (!enteredChallenge) {
        return socket.emit("error", "You are not in a challenge");
      }

      if (enteredTypingSession) {
        socket.leave(enteredChallenge.challengeId);
        await appService.typingService.exitSession(
          enteredTypingSession.sessionId,
          user.userId,
        );
      }

      // await appService.challengeService.leaveChallenge(user.userId, enteredChallenge.challengeId);
      await appService.challengeService.updateChallengeStatus(
        user.userId,
        enteredChallenge.challengeId,
        UserChallengeStatus.Abondoned,
      );
      const participants =
        await appService.challengeService.getChallengeParticipants(
          enteredChallenge.challengeId,
        );
      io.to(enteredChallenge.challengeId).emit("zone-update", participants);
      enteredChallenge = null;
      enteredTypingSession = null;
    });

    socket.on("disconnect", () => {});
  });

  (async () => {
    const unstartedChallenges =
      await appService.challengeService.getUnstartedChallenges();
    unstartedChallenges.forEach((challenge) => {
      const startIn = Math.max(0, challenge.scheduledAt.getTime() - Date.now());
      setTimeout(async () => {
        const count =
          await appService.challengeService.getChallengeParticipantsCount(
            challenge.challengeId,
          );
        if (count > 0) {
          console.log("Starting challenge", challenge.challengeId);
          await appService.challengeService.updateChallenge(
            challenge.challengeId,
            { startedAt: new Date() },
          );
          io.to(challenge.challengeId).emit("start-challenge");
        }
      }, startIn);
    });
  })();
}
