import crypto from "node:crypto";
import mongoose from "mongoose";
import Participant from "../models/Participant.js";
import Prize from "../models/Prize.js";
import Winner from "../models/Winner.js";
import DrawControl from "../models/DrawControl.js";

export async function getParticipants(req, res) {
    const rows = await Participant.find()
        .select("name address luckyNumber phoneLast4")
        .sort({ luckyNumber: 1 });

    return res.json({
        success: true,
        participants: rows.map((item) => ({
            ...item.toObject(),
            id: String(item._id),
        })),
    });
}

export async function getAdminParticipants(req, res) {
    const rows = await Participant.find()
        .select("+phone")
        .sort({ luckyNumber: 1 });

    return res.json({
        success: true,
        participants: rows.map((item) => ({
            ...item.toObject(),
            id: String(item._id),
        })),
    });
}

export async function getPrizes(req, res) {
    const rows = await Prize.find().sort({ category: 1, sequence: 1 });

    return res.json({
        success: true,
        prizes: rows.map((item) => ({
            ...item.toObject(),
            id: String(item._id),
        })),
    });
}

export async function createPrize(req, res) {
    try {
        const data = req.body;
        const limit = data.category === "main" ? 3 : 10;
        const count = await Prize.countDocuments({ category: data.category });

        if (count >= limit) {
            return res.status(400).json({
                success: false,
                message: `You can add only ${limit} ${data.category} prizes.`,
            });
        }

        const prize = await Prize.create({ ...data, sequence: count + 1 });
        return res.status(201).json({ success: true, prize });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}

export async function updatePrize(req, res) {
    try {
        const prize = await Prize.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    name: req.body.name,
                    description: req.body.description,
                    imageUrl: req.body.imageUrl,
                },
            },
            { new: true, runValidators: true }
        );

        if (!prize) {
            return res.status(404).json({
                success: false,
                message: "Prize not found.",
            });
        }

        return res.json({ success: true, prize });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}

export async function deletePrize(req, res) {
    const prize = await Prize.findById(req.params.id);

    if (!prize) {
        return res.status(404).json({
            success: false,
            message: "Prize not found.",
        });
    }

    if (prize.drawn) {
        return res.status(400).json({
            success: false,
            message: "Awarded prize cannot be deleted.",
        });
    }

    await prize.deleteOne();
    await Prize.updateMany(
        { category: prize.category, sequence: { $gt: prize.sequence } },
        { $inc: { sequence: -1 } }
    );

    return res.json({ success: true });
}

export async function getWinners(req, res) {
    const rows = await Winner.find().sort({ drawOrder: 1 });

    return res.json({
        success: true,
        winners: rows.map((item) => ({
            ...item.toObject(),
            id: String(item._id),
            prizeId: String(item.prizeId),
        })),
    });
}


// export async function importCustomers(req, res) {
//     const customers = req.body.customers;

//     if (!Array.isArray(customers) || !customers.length) {
//         return res.status(400).json({
//             success: false,
//             message: "No customer records were provided.",
//         });
//     }

//     const session = await mongoose.startSession();
//     let summary;

//     try {
//         await session.withTransaction(async () => {
//             const existing = await Participant.find()
//                 .select("+phone")
//                 .session(session);

//             const existingPhones = new Set(
//                 existing.map((item) => item.normalizedPhone).filter(Boolean)
//             );

//             const used = new Set(existing.map((item) => item.luckyNumber));
//             const seen = new Set();

//             let duplicateCount = 0;
//             let invalidCount = 0;

//             const accepted = [];

//             for (const customer of customers) {
//                 // CSV structure: Name, Phone, Address
//                 const name = String(customer.name || "").trim();
//                 const phone = String(customer.phone || "").trim();
//                 const address = String(customer.address || "").trim();

//                 let normalizedPhone = phone.replace(/\D/g, "");

//                 // Remove Nepal country code if present
//                 if (
//                     normalizedPhone.startsWith("977") &&
//                     normalizedPhone.length === 13
//                 ) {
//                     normalizedPhone = normalizedPhone.slice(3);
//                 }

//                 // Validate customer information
//                 if (
//                     !name ||
//                     !address ||
//                     !phone
//                 ) {
//                     invalidCount++;
//                     continue;
//                 }

//                 // Check duplicate phone numbers
//                 if (
//                     existingPhones.has(normalizedPhone) ||
//                     seen.has(normalizedPhone)
//                 ) {
//                     duplicateCount++;
//                     continue;
//                 }

//                 seen.add(normalizedPhone);

//                 accepted.push({
//                     name,
//                     phone,
//                     address,
//                     normalizedPhone,

//                     phoneHash: crypto
//                         .createHash("sha256")
//                         .update(normalizedPhone)
//                         .digest("hex"),

//                     phoneLast4: normalizedPhone.slice(-4),
//                 });
//             }

//             const existingCount = existing.length;
//             const total = existingCount + accepted.length;

//             if (total > 700) {
//                 throw Error(
//                     `Maximum participant capacity is 700. Import would result in ${total}.`
//                 );
//             }

//             // Generate unused lucky numbers
//             const numbers = [];

//             for (let number = 1; number <= total; number++) {
//                 if (!used.has(number)) {
//                     numbers.push(number);
//                 }
//             }

//             if (numbers.length !== accepted.length) {
//                 throw Error(
//                     "Existing lucky numbers are inconsistent; fix them before importing."
//                 );
//             }

//             // Randomize lucky numbers
//             for (let index = numbers.length - 1; index > 0; index--) {
//                 const randomIndex = crypto.randomInt(index + 1);

//                 [numbers[index], numbers[randomIndex]] = [
//                     numbers[randomIndex],
//                     numbers[index],
//                 ];
//             }

//             // Save participants
//             if (accepted.length) {
//                 await Participant.insertMany(
//                     accepted.map((item, index) => ({
//                         ...item,
//                         luckyNumber: numbers[index],
//                     })),
//                     { session }
//                 );
//             }

//             summary = {
//                 success: true,
//                 existingCount,
//                 importedCount: accepted.length,
//                 duplicateCount,
//                 invalidCount,
//                 totalParticipants: total,
//                 luckyNumberRange: total ? `1–${total}` : "Not assigned",
//                 remainingCapacity: 1000 - total,
//             };
//         });

//         return res.json(summary);

//     } catch (error) {
//         return res.status(400).json({
//             success: false,
//             message: error.message,
//         });

//     } finally {
//         await session.endSession();
//     }
// }

// export async function importCustomers(req, res) {
//     const customers = req.body.customers;

//     const MAX_PARTICIPANTS = 1000;

//     if (!Array.isArray(customers) || !customers.length) {
//         return res.status(400).json({
//             success: false,
//             message: "No customer records were provided.",
//         });
//     }

//     const session = await mongoose.startSession();
//     let summary;

//     try {
//         await session.withTransaction(async () => {
//             const existing = await Participant.find()
//                 .select("+phone")
//                 .session(session);

//             const existingPhones = new Set(
//                 existing
//                     .map((item) => item.normalizedPhone)
//                     .filter(Boolean)
//             );

//             const used = new Set(
//                 existing.map((item) => item.luckyNumber)
//             );

//             const seen = new Set();

//             let duplicateCount = 0;
//             let invalidCount = 0;

//             const duplicateCustomers = [];
//             const invalidCustomers = [];
//             const accepted = [];

//             for (const customer of customers) {
//                 // CSV structure: Name, Phone, Address
//                 const name = String(customer.name || "").trim();
//                 const phone = String(customer.phone || "").trim();
//                 const address = String(customer.address || "").trim();

//                 // Normalize phone number for duplicate checking
//                 let normalizedPhone = phone.replace(/\D/g, "");

//                 // Remove Nepal country code if present
//                 if (
//                     normalizedPhone.startsWith("977") &&
//                     normalizedPhone.length === 13
//                 ) {
//                     normalizedPhone = normalizedPhone.slice(3);
//                 }

//                 // Allow non-numeric phone values too
//                 if (!normalizedPhone) {
//                     normalizedPhone = phone.toLowerCase();
//                 }

//                 // Required field validation
//                 if (!name || !phone || !address) {
//                     invalidCount++;

//                     invalidCustomers.push({
//                         name: name || "Unknown",
//                         phone,
//                         address,
//                         reason: !name
//                             ? "Missing name"
//                             : !phone
//                                 ? "Missing phone"
//                                 : "Missing address",
//                     });

//                     continue;
//                 }

//                 // Duplicate phone validation
//                 if (
//                     existingPhones.has(normalizedPhone) ||
//                     seen.has(normalizedPhone)
//                 ) {
//                     duplicateCount++;

//                     duplicateCustomers.push({
//                         name,
//                         phone,
//                         address,
//                         reason: "Duplicate phone number",
//                     });

//                     continue;
//                 }

//                 seen.add(normalizedPhone);

//                 accepted.push({
//                     name,
//                     phone,
//                     address,
//                     normalizedPhone,

//                     phoneHash: crypto
//                         .createHash("sha256")
//                         .update(normalizedPhone)
//                         .digest("hex"),

//                     phoneLast4: normalizedPhone.slice(-4),
//                 });
//             }

//             const existingCount = existing.length;
//             const total = existingCount + accepted.length;

//             // Maximum capacity: 1000 customers
//             if (total > MAX_PARTICIPANTS) {
//                 throw Error(
//                     `Maximum participant capacity is ${MAX_PARTICIPANTS}. Import would result in ${total}.`
//                 );
//             }

//             // Generate unused lucky numbers
//             const numbers = [];

//             for (let number = 1; number <= total; number++) {
//                 if (!used.has(number)) {
//                     numbers.push(number);
//                 }
//             }

//             if (numbers.length !== accepted.length) {
//                 throw Error(
//                     "Existing lucky numbers are inconsistent; fix them before importing."
//                 );
//             }

//             // Randomize lucky numbers
//             for (let index = numbers.length - 1; index > 0; index--) {
//                 const randomIndex = crypto.randomInt(index + 1);

//                 [numbers[index], numbers[randomIndex]] = [
//                     numbers[randomIndex],
//                     numbers[index],
//                 ];
//             }

//             // Save accepted customers
//             if (accepted.length) {
//                 await Participant.insertMany(
//                     accepted.map((item, index) => ({
//                         ...item,
//                         luckyNumber: numbers[index],
//                     })),
//                     { session }
//                 );
//             }

//             // Final import summary
//             summary = {
//                 success: true,

//                 existingCount,
//                 importedCount: accepted.length,

//                 duplicateCount,
//                 invalidCount,

//                 duplicateCustomers,
//                 invalidCustomers,

//                 totalParticipants: total,

//                 luckyNumberRange: total
//                     ? `1–${total}`
//                     : "Not assigned",

//                 remainingCapacity: MAX_PARTICIPANTS - total,
//             };
//         });

//         return res.json(summary);

//     } catch (error) {
//         return res.status(400).json({
//             success: false,
//             message: error.message,
//         });

//     } finally {
//         await session.endSession();
//     }
// }


export async function importCustomers(req, res) {
    const customers = req.body.customers;
    const MAX_PARTICIPANTS = 1000;

    if (!Array.isArray(customers) || !customers.length) {
        return res.status(400).json({
            success: false,
            message: "No customer records were provided.",
        });
    }

    // Normalize name
    const normalizeName = (name) =>
        String(name || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

    // Normalize phone number
    const normalizePhone = (phone) => {
        const original = String(phone || "").trim();

        let normalized = original.replace(/\D/g, "");

        // Remove Nepal country code
        if (
            normalized.startsWith("977") &&
            normalized.length === 13
        ) {
            normalized = normalized.slice(3);
        }

        // Support non-numeric phone formats
        return normalized || original.toLowerCase();
    };

    // Create duplicate key using BOTH name and phone
    const createDuplicateKey = (name, phone) =>
        `${normalizeName(name)}|${normalizePhone(phone)}`;

    const session = await mongoose.startSession();
    let summary;

    try {
        await session.withTransaction(async () => {

            // Get existing participants
            const existing = await Participant.find()
                .select("+phone")
                .session(session);

            // Existing name + phone combinations
            const existingCustomers = new Set(
                existing.map((item) =>
                    createDuplicateKey(
                        item.normalizedName || item.name,
                        item.normalizedPhone || item.phone
                    )
                )
            );

            // Existing lucky numbers
            const used = new Set(
                existing.map((item) => item.luckyNumber)
            );

            // Track duplicates within current CSV
            const seen = new Set();

            let duplicateCount = 0;
            let invalidCount = 0;

            const duplicateCustomers = [];
            const invalidCustomers = [];
            const accepted = [];

            // Process CSV customers
            for (const customer of customers) {

                const name = String(customer.name || "").trim();
                const phone = String(customer.phone || "").trim();
                const address = String(customer.address || "").trim();

                const normalizedName = normalizeName(name);
                const normalizedPhone = normalizePhone(phone);

                // Validate required fields
                if (!name || !phone || !address) {
                    invalidCount++;

                    invalidCustomers.push({
                        name: name || "Unknown",
                        phone,
                        address,
                        reason: !name
                            ? "Missing name"
                            : !phone
                                ? "Missing phone"
                                : "Missing address",
                    });

                    continue;
                }

                // Duplicate check: BOTH name and phone must match
                const duplicateKey = createDuplicateKey(
                    normalizedName,
                    normalizedPhone
                );

                if (
                    existingCustomers.has(duplicateKey) ||
                    seen.has(duplicateKey)
                ) {
                    duplicateCount++;

                    duplicateCustomers.push({
                        name,
                        phone,
                        address,
                        reason: "Same name and phone number already exist",
                    });

                    continue;
                }

                // Mark combination as processed
                seen.add(duplicateKey);

                // Accept valid participant
                accepted.push({
                    name,
                    normalizedName,
                    phone,
                    address,
                    normalizedPhone,

                    phoneHash: crypto
                        .createHash("sha256")
                        .update(normalizedPhone)
                        .digest("hex"),

                    phoneLast4: normalizedPhone.slice(-4),
                });
            }

            const existingCount = existing.length;
            const total = existingCount + accepted.length;

            // Maximum participant capacity
            if (total > MAX_PARTICIPANTS) {
                throw Error(
                    `Maximum participant capacity is ${MAX_PARTICIPANTS}. Import would result in ${total}.`
                );
            }

            // Generate unused lucky numbers
            const numbers = [];

            for (let number = 1; number <= total; number++) {
                if (!used.has(number)) {
                    numbers.push(number);
                }
            }

            if (numbers.length !== accepted.length) {
                throw Error(
                    "Existing lucky numbers are inconsistent; fix them before importing."
                );
            }

            // Randomize lucky numbers
            for (let index = numbers.length - 1; index > 0; index--) {
                const randomIndex = crypto.randomInt(index + 1);

                [numbers[index], numbers[randomIndex]] = [
                    numbers[randomIndex],
                    numbers[index],
                ];
            }

            // Save accepted participants
            if (accepted.length) {
                await Participant.insertMany(
                    accepted.map((item, index) => ({
                        ...item,
                        luckyNumber: numbers[index],
                    })),
                    { session }
                );
            }

            // Import summary
            summary = {
                success: true,

                existingCount,
                importedCount: accepted.length,

                duplicateCount,
                invalidCount,

                duplicateCustomers,
                invalidCustomers,

                totalParticipants: total,

                luckyNumberRange: total
                    ? `1–${total}`
                    : "Not assigned",

                remainingCapacity: MAX_PARTICIPANTS - total,
            };
        });

        return res.json(summary);

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });

    } finally {
        await session.endSession();
    }
}


export async function drawNextWinner(req, res) {
    const session = await mongoose.startSession();
    let output;

    try {
        await session.withTransaction(async () => {
            const winners = await Winner.find()
                .sort({ drawOrder: 1 })
                .session(session);
            const order = winners.length + 1;

            if (order > 13) {
                throw Error("All 13 winners have already been selected.");
            }

            const category = order <= 3 ? "main" : "small";
            const prizes = await Prize.find({ category })
                .sort({ sequence: 1 })
                .session(session);
            const expected = category === "main" ? 3 : 10;

            if (
                prizes.length !== expected ||
                prizes.some((prize, index) => prize.sequence !== index + 1)
            ) {
                throw Error(
                    `You must configure exactly ${expected} ${category} prizes in sequence.`
                );
            }

            const prize = prizes.find((item) => !item.drawn);
            if (!prize) throw Error("No available prizes remain.");

            const used = new Set(winners.map((winner) => winner.luckyNumber));
            const eligible = await Participant.find({
                luckyNumber: { $nin: [...used] },
            }).session(session);
            const valid = eligible.filter(
                (person) =>
                    Number.isInteger(person.luckyNumber) &&
                    person.luckyNumber > 0 &&
                    person.name?.trim()
            );

            if (!valid.length) {
                throw Error("No eligible participants remain.");
            }

            const person = valid[crypto.randomInt(valid.length)];
            const winner = {
                name: person.name,
                luckyNumber: person.luckyNumber,
                phoneLast4: person.phoneLast4 || "",
                prizeId: prize._id,
                prizeName: prize.name,
                prizeDescription: prize.description,
                prizeImageUrl: prize.imageUrl,
                prizeNumber: category === "main" ? order : order - 3,
                category,
                drawOrder: order,
            };

            const [saved] = await Winner.create([winner], { session });
            prize.drawn = true;
            prize.drawnAt = new Date();
            prize.winnerId = saved._id;
            await prize.save({ session });

            await DrawControl.findOneAndUpdate(
                { key: "main" },
                {
                    $set: {
                        lastDrawOrder: order,
                        lastPrizeId: String(prize._id),
                    },
                },
                { upsert: true, session }
            );

            output = {
                ...saved.toObject(),
                id: String(saved._id),
                winnerId: String(saved._id),
                eligibleCount: valid.length,
            };
        });

        return res.json({
            success: true,
            message: "Winner selected successfully.",
            winner: output,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    } finally {
        await session.endSession();
    }
}

export function testAdmin(req, res) {
    return res.json({
        success: true,
        message: "Administrator verified successfully.",
        admin: req.admin,
    });
}




export async function resetEntireDraw(req, res) {
    const session = await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            // 1. Delete all previous winners
            const deletedWinners = await Winner.deleteMany(
                {},
                { session }
            );

            // 2. Reset all prizes
            const resetPrizes = await Prize.updateMany(
                {},
                {
                    $set: {
                        drawn: false,
                    },
                    $unset: {
                        winnerId: "",
                        drawnAt: "",
                    },
                },
                { session }
            );

            // 3. Remove current draw progress
            // drawNextWinner will recreate this document using upsert.
            const deletedDrawControl = await DrawControl.deleteOne(
                { key: "main" },
                { session }
            );

            result = {
                success: true,
                message: "Entire draw has been reset successfully.",
                deletedWinners: deletedWinners.deletedCount,
                resetPrizes: resetPrizes.modifiedCount,
                deletedDrawControl: deletedDrawControl.deletedCount,
            };
        });

        return res.json(result);

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Unable to reset the draw.",
        });

    } finally {
        await session.endSession();
    }
}
