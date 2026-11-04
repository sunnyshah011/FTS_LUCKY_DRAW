
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");
const {
  randomInt,
  randomUUID,
  createHash,
} = require("crypto");

initializeApp();

const db = getFirestore();

const MAX_PARTICIPANTS = 700;
const FUNCTION_REGION = "asia-south1";
const BATCH_SIZE = 249;

/**
 * Normalizes a phone number for duplicate detection.
 * @param {string} phone Customer phone number.
 * @return {string} Normalized phone number.
 */
function normalizePhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("977") && digits.length === 13) {
    digits = digits.slice(3);
  }

  return digits;
}

/**
 * Creates a private hash for phone-number indexing.
 * @param {string} phone Normalized phone number.
 * @return {string} SHA-256 hash.
 */
function hashPhone(phone) {
  return createHash("sha256").update(phone).digest("hex");
}

/**
 * Randomly shuffles an array.
 * @param {Array<number>} array Numbers to shuffle.
 * @return {Array<number>} Shuffled numbers.
 */
function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

exports.importCustomers = onCall(
    {
      region: FUNCTION_REGION,
      timeoutSeconds: 540,
      memory: "512MiB",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please log in as an administrator.",
        );
      }

      const adminRef = db.collection("admins").doc(request.auth.uid);
      const adminSnapshot = await adminRef.get();

      if (
        !adminSnapshot.exists ||
        adminSnapshot.data().active !== true ||
        adminSnapshot.data().role !== "admin"
      ) {
        throw new HttpsError(
            "permission-denied",
            "You are not authorized to import customers.",
        );
      }

      const customers = request.data && request.data.customers;

      if (!Array.isArray(customers) || customers.length === 0) {
        throw new HttpsError(
            "invalid-argument",
            "Please provide customer records.",
        );
      }

      if (customers.length > MAX_PARTICIPANTS) {
        throw new HttpsError(
            "invalid-argument",
            "A single import cannot contain more than 700 records.",
        );
      }

      const lockRef = db.collection("_system").doc("importControl");
      const lockToken = randomUUID();
      let lockAcquired = false;
      let batchRef = null;

      try {
        // Acquire the import lock.
        await db.runTransaction(async (transaction) => {
          const lockSnapshot = await transaction.get(lockRef);

          if (lockSnapshot.exists) {
            const lock = lockSnapshot.data();

            if (
              lock.status === "processing" &&
              lock.startedAt &&
              Date.now() - lock.startedAt.toMillis() <
                10 * 60 * 1000
            ) {
              throw new HttpsError(
                  "aborted",
                  "Another customer import is already running.",
              );
            }
          }

          transaction.set(lockRef, {
            status: "processing",
            token: lockToken,
            startedAt: Timestamp.now(),
          });

          lockAcquired = true;
        });

        const publicRef = db.collection("participants");
        const privateRef = db.collection("privateParticipants");

        // Read existing records.
        const [publicSnapshot, privateSnapshot] = await Promise.all([
          publicRef.get(),
          privateRef.get(),
        ]);

        const usedNumbers = new Set();
        const existingPhones = new Set();

        publicSnapshot.forEach((document) => {
          const number = Number(document.data().luckyNumber);

          if (Number.isInteger(number)) {
            usedNumbers.add(number);
          }
        });

        privateSnapshot.forEach((document) => {
          const phone = normalizePhone(document.data().phone);

          if (phone) {
            existingPhones.add(phone);
          }
        });

        const availableNumbers = [];

        for (let i = 1; i <= MAX_PARTICIPANTS; i++) {
          if (!usedNumbers.has(i)) {
            availableNumbers.push(i);
          }
        }

        const shuffledNumbers = shuffle(availableNumbers);

        const seenPhones = new Set();
        const accepted = [];
        let duplicateCount = 0;
        let invalidCount = 0;

        // Validate and filter customer records.
        for (const customer of customers) {
          const name = String(
              customer && customer.name || "",
          ).trim();

          const address = String(
              customer && customer.address || "",
          ).trim();

          const phone = String(
              customer && customer.phone || "",
          ).trim();

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
            phoneHash: hashPhone(normalizedPhone),
            participantRef: publicRef.doc(),
          });
        }

        if (accepted.length > shuffledNumbers.length) {
          throw new HttpsError(
              "resource-exhausted",
              `Only ${shuffledNumbers.length} lucky numbers are available.`,
          );
        }

        const batchId = db.collection("importBatches").doc().id;
        batchRef = db.collection("importBatches").doc(batchId);

        await batchRef.set({
          status: "processing",
          importedCount: 0,
          duplicateCount,
          invalidCount,
          importedBy: request.auth.uid,
          createdAt: FieldValue.serverTimestamp(),
        });

        let importedCount = 0;

        // Process customers in atomic transaction groups.
        for (
          let start = 0;
          start < accepted.length;
          start += BATCH_SIZE
        ) {
          const customerChunk = accepted.slice(
              start,
              start + BATCH_SIZE,
          );

          const numberChunk = shuffledNumbers.slice(
              start,
              start + customerChunk.length,
          );

          await db.runTransaction(async (transaction) => {
            const lockSnapshot = await transaction.get(lockRef);

            if (
              !lockSnapshot.exists ||
              lockSnapshot.data().token !== lockToken
            ) {
              throw new HttpsError(
                  "aborted",
                  "The import lock has changed. Please retry.",
              );
            }

            const privateRefs = customerChunk.map((customer) =>
              privateRef.doc(customer.phoneHash),
            );

            const privateSnapshots = await Promise.all(
                privateRefs.map((ref) => transaction.get(ref)),
            );

            if (privateSnapshots.some((snapshot) => snapshot.exists)) {
              throw new HttpsError(
                  "already-exists",
                  "A customer phone number already exists. " +
                  "Please review the import before retrying.",
              );
            }

            customerChunk.forEach((customer, index) => {
              const luckyNumber = numberChunk[index];
              const participantId = customer.participantRef.id;

              transaction.create(customer.participantRef, {
                name: customer.name,
                luckyNumber,
                phoneLast4: customer.normalizedPhone.slice(-4),
                importBatchId: batchId,
                createdAt: FieldValue.serverTimestamp(),
              });

              transaction.create(
                  privateRefs[index],
                  {
                    participantId,
                    phone: customer.phone,
                    normalizedPhone: customer.normalizedPhone,
                    address: customer.address,
                    createdAt: FieldValue.serverTimestamp(),
                  },
              );
            });
          });

          importedCount += customerChunk.length;
        }

        await batchRef.update({
          status: "completed",
          importedCount,
          completedAt: FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          importedCount,
          duplicateCount,
          invalidCount,
          remainingNumbers: shuffledNumbers.length - importedCount,
          message: "Customer import completed successfully.",
        };
      } catch (error) {
        console.error(
            "Customer import failed:",
            error.message,
        );

        if (batchRef) {
          try {
            await batchRef.update({
              status: "failed",
              failedAt: FieldValue.serverTimestamp(),
            });
          } catch (batchError) {
            console.error(
                "Could not update import batch status:",
                batchError.message,
            );
          }
        }

        if (error instanceof HttpsError) {
          throw error;
        }

        throw new HttpsError(
            "internal",
            "Customer import failed. Check the import status " +
            "before retrying.",
        );
      } finally {
        if (lockAcquired) {
          try {
            await db.runTransaction(async (transaction) => {
              const snapshot = await transaction.get(lockRef);

              if (
                snapshot.exists &&
                snapshot.data().token === lockToken
              ) {
                transaction.delete(lockRef);
              }
            });
          } catch (error) {
            console.error(
                "Could not release import lock:",
                error.message,
            );
          }
        }
      }
    },
);
