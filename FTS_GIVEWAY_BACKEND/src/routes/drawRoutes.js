import { Router } from "express";
import { randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { db } from "../config/firebase.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = Router();

router.get("/test", verifyAdmin, (req, res) => {
  res.json({
    success: true,
    message: "Administrator verified successfully.",
    admin: req.admin,
  });
});

router.post("/next", verifyAdmin, async (req, res) => {
  try {
    const controlRef = db.collection("_system").doc("drawControl");
    const winnerRef = db.collection("winners").doc();
    const drawRef = db.collection("draws").doc();

    const result = await db.runTransaction(async (transaction) => {
      // Read all required documents before performing writes.
      const [
        participantsSnapshot,
        winnersSnapshot,
        prizesSnapshot,
        controlSnapshot,
      ] = await Promise.all([
        transaction.get(db.collection("participants")),
        transaction.get(db.collection("winners")),
        transaction.get(db.collection("prizes")),
        transaction.get(controlRef),
      ]);

      const previousWinners = winnersSnapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      // Check that the saved draw progress matches the winner records.
      const savedDrawOrder = controlSnapshot.exists
        ? Number(controlSnapshot.data().lastDrawOrder || 0)
        : 0;

      if (controlSnapshot.exists && savedDrawOrder !== previousWinners.length) {
        throw new Error(
          "Draw records are inconsistent. Please contact the administrator before continuing.",
        );
      }

      const drawOrder = previousWinners.length + 1;

      if (drawOrder > 13) {
        throw new Error("All 13 winners have already been selected.");
      }

      // First 3 draws are main prizes; remaining 10 are small prizes.
      const category = drawOrder <= 3 ? "main" : "small";

      const categoryPrizes = prizesSnapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .filter((prize) => prize.category === category)
        .sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));

      const expectedPrizeCount = category === "main" ? 3 : 10;

      if (categoryPrizes.length !== expectedPrizeCount) {
        throw new Error(
          `You must configure exactly ${expectedPrizeCount} ${category} prizes.`,
        );
      }

      // Validate the complete prize sequence.
      const validSequence = categoryPrizes.every(
        (prize, index) => prize.sequence === index + 1,
      );

      if (!validSequence) {
        throw new Error(
          `Invalid ${category} prize sequence. Please check the prize order.`,
        );
      }

      // Exclude prizes already awarded.
      const awardedPrizeIds = new Set(
        previousWinners.map((winner) => winner.prizeId),
      );

      const availablePrizes = categoryPrizes.filter(
        (prize) => !awardedPrizeIds.has(prize.id),
      );

      if (availablePrizes.length === 0) {
        throw new Error(`No available ${category} prizes remain.`);
      }

      const selectedPrize = availablePrizes[0];

      // A prize marked as drawn without a corresponding winner
      // indicates inconsistent records. Do not award it again.
      if (selectedPrize.drawn === true) {
        throw new Error(
          "The next prize is already marked as drawn. Please check the prize records before continuing.",
        );
      }

      // Exclude participants who have already won.
      const winningNumbers = new Set(
        previousWinners.map((winner) => String(winner.luckyNumber)),
      );

      const eligibleParticipants = participantsSnapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .filter(
          (participant) =>
            Number.isInteger(participant.luckyNumber) &&
            participant.luckyNumber > 0 &&
            typeof participant.name === "string" &&
            participant.name.trim().length > 0 &&
            !winningNumbers.has(String(participant.luckyNumber)),
        );

      if (eligibleParticipants.length === 0) {
        throw new Error("No eligible participants remain.");
      }

      // Secure random selection on the backend.
      const selectedParticipant =
        eligibleParticipants[randomInt(eligibleParticipants.length)];

      const prizeNumber = category === "main" ? drawOrder : drawOrder - 3;

      // Snapshot prize information into the winner record.
      // Historical winner cards will not depend on future prize edits.
      const winnerData = {
        name: selectedParticipant.name,
        luckyNumber: selectedParticipant.luckyNumber,
        phoneLast4: selectedParticipant.phoneLast4 || "",

        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name || "",
        prizeDescription: selectedPrize.description || "",
        prizeImageUrl: selectedPrize.imageUrl || "",

        prizeNumber,
        category,
        drawOrder,
        createdAt: FieldValue.serverTimestamp(),
      };

      // Save the winner, draw history and prize status atomically.
      transaction.set(winnerRef, winnerData);
      transaction.set(drawRef, winnerData);

      transaction.update(db.collection("prizes").doc(selectedPrize.id), {
        drawn: true,
        drawnAt: FieldValue.serverTimestamp(),
        winnerId: winnerRef.id,
      });

      transaction.set(
        controlRef,
        {
          lastDrawOrder: drawOrder,
          lastPrizeId: selectedPrize.id,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Do not return Firestore server timestamp values in the API response.
      const { createdAt, ...responseWinner } = winnerData;

      return {
        ...responseWinner,
        winnerId: winnerRef.id,
        drawId: drawRef.id,
        eligibleCount: eligibleParticipants.length,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Winner selected successfully.",
      winner: result,
    });
  } catch (error) {
    console.error("Draw error:", error);

    return res.status(error.code ? 500 : 400).json({
      success: false,
      message: error.message || "Unable to complete the draw.",
    });
  }
});

export default router;
