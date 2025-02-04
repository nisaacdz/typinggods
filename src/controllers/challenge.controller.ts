import { Request, Response } from "express";
import { createChallenge, addParticipant, getUserChallenges, acceptChallenge, getChallengeById, getAcceptedChallenge, getAllChallenges, getOpenChallenges } from "../services/challenges.service";
import { ChallengePrivacy, NewChallenge, UserChallengeStatus } from "../db/schema/db.schema";
import { getCurrentUser } from "../services/auth.service";

export const createNewChallenge = async (req: Request, res: Response) => {
    const userId = req.params.userId;             
    const currentChallenge = await getAcceptedChallenge(userId);

    if (currentChallenge) {
        return res.status(400).json({ message: "User is already in a challenge" });
    }

    const challenge = req.body.challenge as NewChallenge; // maybe zod validation middleware before this runs
    const otherParticipants = req.body.participants as string[];

    if (!challenge || !otherParticipants) { // May need to allow empty otherParticipants list
        return res.status(400).json({ message: "Invalid request" });
    }

    try {
        const newChallenge = await createChallenge(challenge);
        await addParticipant(newChallenge.challengeId, userId);
        otherParticipants.forEach(async (participant) => {
            await addParticipant(newChallenge.challengeId, participant);
        });
        return res.json(newChallenge);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }

};

export const joinChallenge = async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const challengeId = req.params.challengeId;

    const currentChallenge = await getAcceptedChallenge(userId);

    if (currentChallenge) {
        return res.status(400).json({ message: "User is already in a challenge" });
    }

    const challenge = await getChallengeById(challengeId);

    if (!challenge) {
        return res.status(400).json({ message: "Challenge not found" });
    }

    if (challenge.privacy === ChallengePrivacy.Invitational) {
        // should return unauthorized error
        return res.status(401).json({ message: "Challenge is invitational" });
    }

    try {
        await addParticipant(challengeId, userId, UserChallengeStatus.Accepted);
        return res.json({ message: "User joined challenge" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const acceptUserChallenge = async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const challengeId = req.params.challengeId;
    
    const challenge = await getAcceptedChallenge(userId);

    if (!challenge || challenge.challengeId !== challengeId) {
        return res.status(400).json({ message: "User is not in the challenge" });
    }

    try {
        await acceptChallenge(challengeId, userId);
        return res.json({ message: "User accepted challenge" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getOpenUserChallenges = async (req: Request, res: Response) => {
    const challenges = getOpenChallenges(req);
    return res.json(challenges);
};

export const getInvitationalChallenges = async (req: Request, res: Response) => {
    const userId = getCurrentUser(req);
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const challenges = await getUserChallenges(userId);
    return res.json(challenges);
}

export const getAllUserChallenges = async (req: Request, res: Response) => {
    const allChallenges = await getAllChallenges(req);
    return res.json(allChallenges);
}