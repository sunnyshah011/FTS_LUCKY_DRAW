
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";

const MAX_PARTICIPANTS = 700;
const BATCH_SIZE = 200;

function normalizePhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("977") && digits.length === 13) {
    digits = digits.slice(3);
  }

  return digits;
}

async function hashPhone(phone) {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Secure browser support is required. Open the website using HTTPS or localhost."
    );
  }

  const encoded = new TextEncoder().encode(phone);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function shuffleNumbers(numbers) {
  const result = [...numbers];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export async function importCustomersDirect(customers) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in as an administrator.");
  }

  if (!Array.isArray(customers) || customers.length === 0) {
    throw new Error("No customer records were provided.");
  }

  // Verify administrator status.
  const adminSnapshot = await getDoc(doc(db, "admins", user.uid));

  if (
    !adminSnapshot.exists() ||
    adminSnapshot.data().active !== true ||
    adminSnapshot.data().role !== "admin"
  ) {
    throw new Error("You are not authorized to import customers.");
  }

  const lockRef = doc(db, "_system", "importControl");
  const lockToken = globalThis.crypto.randomUUID();

  let lockAcquired = false;

  try {
    // Acquire import lock.
    await runTransaction(db, async (transaction) => {
      const lockSnapshot = await transaction.get(lockRef);

      if (lockSnapshot.exists()) {
        throw new Error(
          "Another import is running, or a previous import left a lock. Please check the import lock before retrying."
        );
      }

      transaction.set(lockRef, {
        token: lockToken,
        startedAt: serverTimestamp(),
        startedBy: user.uid,
      });
    });

    lockAcquired = true;

    // Read existing records.
    const [publicSnapshot, privateSnapshot] = await Promise.all([
      getDocs(collection(db, "participants")),
      getDocs(collection(db, "privateParticipants")),
    ]);

    const existingCount = publicSnapshot.size;
    const usedNumbers = new Set();
    const existingPhones = new Set();

    publicSnapshot.forEach((item) => {
      const number = Number(item.data().luckyNumber);

      if (!Number.isInteger(number) || number < 1) {
        throw new Error(
          `Existing participant ${item.id} has an invalid lucky number. Please correct the data before importing.`
        );
      }

      if (usedNumbers.has(number)) {
        throw new Error(
          `Lucky number ${number} is already assigned more than once. Please correct existing data before importing.`
        );
      }

      usedNumbers.add(number);
    });

    privateSnapshot.forEach((item) => {
      const data = item.data();
      const phone = normalizePhone(
        data.normalizedPhone || data.phone
      );

      if (phone) {
        existingPhones.add(phone);
      }
    });

    // Validate new customers.
    const seenPhones = new Set();
    const accepted = [];

    let duplicateCount = 0;
    let invalidCount = 0;

    for (const customer of customers) {
      const name = String(customer.name || "").trim();
      const address = String(customer.address || "").trim();
      const phone = String(customer.phone || "").trim();

      const normalizedPhone = normalizePhone(phone);

      if (
        !name ||
        !address ||
        !normalizedPhone ||
        normalizedPhone.length < 7 ||
        name.length > 150 ||
        address.length > 500 ||
        phone.length > 30
      ) {
        invalidCount++;
        continue;
      }

      if (
        existingPhones.has(normalizedPhone) ||
        seenPhones.has(normalizedPhone)
      ) {
        duplicateCount++;
        continue;
      }

      seenPhones.add(normalizedPhone);

      accepted.push({
        name,
        address,
        phone,
        normalizedPhone,
        phoneHash: await hashPhone(normalizedPhone),
        participantRef: doc(collection(db, "participants")),
      });
    }

    if (accepted.length === 0) {
      return {
        success: true,
        importedCount: 0,
        duplicateCount,
        invalidCount,
        existingCount,
        totalParticipants: existingCount,
        luckyNumberRange: existingCount
          ? `1–${existingCount}`
          : "Not assigned",
      };
    }

    // Calculate the new dynamic participant range.
    const newTotal = existingCount + accepted.length;

    if (newTotal > MAX_PARTICIPANTS) {
      throw new Error(
        `This import would increase the total to ${newTotal} participants. The current maximum capacity is ${MAX_PARTICIPANTS}.`
      );
    }

    // Existing lucky numbers must fit inside the new dynamic range.
    for (const number of usedNumbers) {
      if (number > newTotal) {
        throw new Error(
          `An existing participant has lucky number ${number}, but the new total is only ${newTotal}. Existing numbers cannot be preserved within this range. For a fresh start, remove the old demo participants and import again.`
        );
      }
    }

    // Generate only the unused numbers from 1 to newTotal.
    const availableNumbers = [];

    for (let number = 1; number <= newTotal; number++) {
      if (!usedNumbers.has(number)) {
        availableNumbers.push(number);
      }
    }

    if (availableNumbers.length !== accepted.length) {
      throw new Error(
        "Lucky number calculation failed. Please check existing participant records."
      );
    }

    const shuffledNumbers = shuffleNumbers(availableNumbers);

    let importedCount = 0;

    // Save records in atomic groups.
    for (
      let start = 0;
      start < accepted.length;
      start += BATCH_SIZE
    ) {
      const customerChunk = accepted.slice(
        start,
        start + BATCH_SIZE
      );

      const numberChunk = shuffledNumbers.slice(
        start,
        start + customerChunk.length
      );

      await runTransaction(db, async (transaction) => {
        const currentLock = await transaction.get(lockRef);

        if (
          !currentLock.exists() ||
          currentLock.data().token !== lockToken
        ) {
          throw new Error(
            "The import lock changed. Please stop and check the import status."
          );
        }

        const privateRefs = customerChunk.map((customer) =>
          doc(db, "privateParticipants", customer.phoneHash)
        );

        // Read all private documents before writing.
        const privateSnapshots = await Promise.all(
          privateRefs.map((ref) => transaction.get(ref))
        );

        if (privateSnapshots.some((snapshot) => snapshot.exists())) {
          throw new Error(
            "A customer phone number already exists. Please review the import."
          );
        }

        customerChunk.forEach((customer, index) => {
          const luckyNumber = numberChunk[index];

          transaction.set(customer.participantRef, {
            name: customer.name,
            luckyNumber,
            phoneLast4: customer.normalizedPhone.slice(-4),
            createdAt: serverTimestamp(),
          });

          transaction.set(privateRefs[index], {
            participantId: customer.participantRef.id,
            phone: customer.phone,
            normalizedPhone: customer.normalizedPhone,
            address: customer.address,
            createdAt: serverTimestamp(),
          });
        });
      });

      importedCount += customerChunk.length;
    }

    return {
      success: true,
      importedCount,
      duplicateCount,
      invalidCount,
      existingCount,
      totalParticipants: newTotal,
      luckyNumberRange: `1–${newTotal}`,
      remainingCapacity: MAX_PARTICIPANTS - newTotal,
    };
  } finally {
    // Release only the lock owned by this import.
    if (lockAcquired) {
      try {
        await runTransaction(db, async (transaction) => {
          const currentLock = await transaction.get(lockRef);

          if (
            currentLock.exists() &&
            currentLock.data().token === lockToken
          ) {
            transaction.delete(lockRef);
          }
        });
      } catch (error) {
        console.error("Could not release import lock:", error);
      }
    }
  }
}
