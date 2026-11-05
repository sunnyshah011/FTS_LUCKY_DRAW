import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Trophy,
  Gift,
  Users,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import { db } from "../../services/firebase";
import { drawNextWinner } from "../../services/backendService";

export default function DrawControl() {
  const [participants, setParticipants] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [winners, setWinners] = useState([]);

  const [loaded, setLoaded] = useState({
    participants: false,
    prizes: false,
    winners: false,
  });

  const [drawing, setDrawing] = useState(false);
  const [displayNumber, setDisplayNumber] = useState(null);
  const [revealedWinner, setRevealedWinner] = useState(null);
  const [error, setError] = useState("");

  // Listen for live Firestore updates.
  useEffect(() => {
    const markLoaded = (key) => {
      setLoaded((previous) => ({
        ...previous,
        [key]: true,
      }));
    };

    const unsubscribers = [
      onSnapshot(
        collection(db, "participants"),
        (snapshot) => {
          setParticipants(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })),
          );
          markLoaded("participants");
        },
        (err) => {
          console.error("Participants listener:", err);
          setError("Unable to load participants.");
          markLoaded("participants");
        },
      ),

      onSnapshot(
        collection(db, "prizes"),
        (snapshot) => {
          setPrizes(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })),
          );
          markLoaded("prizes");
        },
        (err) => {
          console.error("Prizes listener:", err);
          setError("Unable to load prizes.");
          markLoaded("prizes");
        },
      ),

      onSnapshot(
        collection(db, "winners"),
        (snapshot) => {
          setWinners(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })),
          );
          markLoaded("winners");
        },
        (err) => {
          console.error("Winners listener:", err);
          setError("Unable to load previous winners.");
          markLoaded("winners");
        },
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const loading = !Object.values(loaded).every(Boolean);

  const sortedWinners = useMemo(
    () => [...winners].sort((a, b) => (a.drawOrder || 0) - (b.drawOrder || 0)),
    [winners],
  );

  const mainPrizes = useMemo(
    () =>
      prizes
        .filter((prize) => prize.category === "main")
        .sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999)),
    [prizes],
  );

  const smallPrizes = useMemo(
    () =>
      prizes
        .filter((prize) => prize.category === "small")
        .sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999)),
    [prizes],
  );

  const drawOrder = sortedWinners.length + 1;
  const drawComplete = sortedWinners.length >= 13;

  const nextCategory = drawOrder <= 3 ? "main" : "small";
  const nextPrizeNumber = drawOrder <= 3 ? drawOrder : drawOrder - 3;

  const nextPrizeList = nextCategory === "main" ? mainPrizes : smallPrizes;

  const nextPrize = nextPrizeList.find(
    (prize) => prize.sequence === nextPrizeNumber,
  );

  const allPrizesReady =
    mainPrizes.length === 3 &&
    smallPrizes.length === 10 &&
    mainPrizes.every((prize, index) => prize.sequence === index + 1) &&
    smallPrizes.every((prize, index) => prize.sequence === index + 1);

  const winningNumbers = useMemo(
    () => new Set(sortedWinners.map((winner) => String(winner.luckyNumber))),
    [sortedWinners],
  );

  const eligibleParticipants = useMemo(
    () =>
      participants.filter(
        (participant) =>
          Number.isInteger(participant.luckyNumber) &&
          participant.luckyNumber > 0 &&
          participant.name &&
          !winningNumbers.has(String(participant.luckyNumber)),
      ),
    [participants, winningNumbers],
  );

  const latestWinner =
    revealedWinner || sortedWinners[sortedWinners.length - 1] || null;

  // Animate eligible lucky numbers while the backend processes the draw.
  useEffect(() => {
    if (!drawing || eligibleParticipants.length === 0) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(
        Math.random() * eligibleParticipants.length,
      );

      setDisplayNumber(eligibleParticipants[randomIndex].luckyNumber);
    }, 75);

    return () => clearInterval(interval);
  }, [drawing, eligibleParticipants]);

  async function handleStartDraw() {
    if (drawing || loading || drawComplete) return;

    if (!allPrizesReady) {
      setError(
        "Please configure exactly 3 main prizes and 10 small prizes with correct sequence numbers.",
      );
      return;
    }

    if (!nextPrize) {
      setError("The next prize could not be found.");
      return;
    }

    if (eligibleParticipants.length === 0) {
      setError("No eligible participants remain.");
      return;
    }

    const confirmed = window.confirm(
      `Start Draw #${drawOrder}?\n\nPrize: ${nextPrize.name}\n\nThis will permanently select and save a real winner.`,
    );

    if (!confirmed) return;

    setError("");
    setRevealedWinner(null);
    setDrawing(true);

    try {
      // Let the number animation run before requesting the real result.
      await new Promise((resolve) => setTimeout(resolve, 1800));

      // The secure backend makes the actual selection.
      const response = await drawNextWinner();

      if (!response.success || !response.winner) {
        throw new Error("The backend did not return a valid winner.");
      }

      setDisplayNumber(response.winner.luckyNumber);
      setRevealedWinner(response.winner);
    } catch (err) {
      console.error("Draw failed:", err);
      setError(err.message || "Unable to complete the draw.");
    } finally {
      setDrawing(false);
    }
  }

  return (
    <section className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">
            Lucky Draw <span className="gold">Control</span>
          </h1>
          <p className="text-stone-400 mt-2">
            Manage and conduct the 13-winner lucky draw.
          </p>
        </div>

        <div className="flex items-center gap-2 text-green-400 text-sm">
          <ShieldCheck size={19} />
          Secure Backend
        </div>
      </div>

      {/* Progress */}
      <div className="panel p-5">
        <div className="flex justify-between items-center gap-3 mb-3">
          <div>
            <p className="text-sm text-stone-400">Draw Progress</p>
            <p className="text-2xl font-black gold mt-1">
              {Math.min(sortedWinners.length, 13)} / 13
            </p>
          </div>

          <Trophy size={32} className="gold" />
        </div>

        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(sortedWinners.length / 13, 1) * 100}%`,
            }}
          />
        </div>

        <div className="flex justify-between text-xs text-stone-500 mt-2">
          <span>Draw started</span>
          <span>{13 - Math.min(sortedWinners.length, 13)} remaining</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Summary
          title="Total Participants"
          value={participants.length}
          icon={<Users size={22} />}
        />

        <Summary
          title="Total Winners"
          value={Math.min(sortedWinners.length, 13)}
          icon={<Trophy size={22} />}
        />

        <Summary
          title="Eligible Participants"
          value={eligibleParticipants.length}
          icon={<Sparkles size={22} />}
        />
      </div>

      {loading && (
        <div className="panel p-6 text-center text-stone-400">
          Loading draw information...
        </div>
      )}

      {/* Configuration warning */}
      {!loading && !allPrizesReady && (
        <div className="panel p-5 border border-yellow-500/30">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="text-yellow-400 shrink-0" />
            <div>
              <p className="font-bold text-yellow-400">
                Prize configuration incomplete
              </p>
              <p className="text-sm text-stone-400 mt-2">
                Required: 3 main prizes and 10 small prizes, each with the
                correct sequence from 1.
              </p>
              <p className="text-sm text-stone-400 mt-1">
                Currently: {mainPrizes.length}/3 main and {smallPrizes.length}
                /10 small prizes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main draw area */}
      {!loading && !drawComplete && allPrizesReady && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Current prize */}
          <div className="panel p-6">
            <div className="flex items-center gap-2 gold mb-5">
              <Gift size={22} />
              <span className="font-bold uppercase tracking-wider text-sm">
                Upcoming Prize
              </span>
            </div>

            <div className="flex items-center justify-center rounded-xl bg-white/5 h-52 mb-5">
              {nextPrize?.imageUrl ? (
                <img
                  src={nextPrize.imageUrl}
                  alt={nextPrize.name}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <Gift size={75} className="gold opacity-60" />
              )}
            </div>

            <p className="text-xs uppercase tracking-widest text-stone-500">
              {nextCategory === "main" ? "Main Prize" : "Small Prize"} · Prize{" "}
              {nextPrizeNumber}
            </p>

            <h2 className="text-2xl font-black mt-2">{nextPrize?.name}</h2>

            <p className="text-sm text-stone-400 mt-2">
              {nextPrize?.description || "Get ready for the next lucky winner!"}
            </p>
          </div>

          {/* Number animation */}
          <div className="panel p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-stone-400 uppercase tracking-widest">
              {drawing ? "Selecting Lucky Number" : "Lucky Number"}
            </p>

            <div
              className={`my-7 w-48 h-48 rounded-full border-4 border-yellow-500/60 flex items-center justify-center bg-yellow-500/5 ${
                drawing ? "animate-pulse" : ""
              }`}
            >
              <span className="text-6xl font-black gold tabular-nums">
                {displayNumber ?? "???"}
              </span>
            </div>

            <p className="text-stone-400 text-sm mb-6">
              {drawing
                ? "Please wait. Selecting the winner..."
                : "Ready to select the next lucky winner?"}
            </p>

            <button
              onClick={handleStartDraw}
              disabled={
                drawing ||
                drawComplete ||
                !allPrizesReady ||
                eligibleParticipants.length === 0
              }
              className="btn-primary w-full max-w-sm disabled:opacity-50"
            >
              {drawing ? "Selecting Winner..." : `Start Draw #${drawOrder}`}
            </button>

            <p className="text-xs text-stone-500 mt-4">
              The actual winner is selected securely by the backend.
            </p>
          </div>
        </div>
      )}

      {/* Winner announcement */}
      {latestWinner && (
        <div className="panel p-7 border border-yellow-500/30 text-center">
          <Sparkles size={38} className="gold mx-auto mb-3" />

          <p className="text-sm uppercase tracking-widest gold font-bold">
            {revealedWinner ? "Winner Announced!" : "Previous Winner"}
          </p>

          <h2 className="text-3xl font-black mt-3">{latestWinner.name}</h2>

          <p className="text-stone-400 mt-2">Lucky Number</p>

          <p className="text-5xl font-black gold mt-2">
            {latestWinner.luckyNumber}
          </p>

          <div className="mt-5 inline-flex flex-col gap-2 bg-white/5 rounded-xl p-4">
            <p className="font-bold">{latestWinner.prizeName}</p>
            <p className="text-xs text-stone-400">
              {latestWinner.category === "main" ? "Main Prize" : "Small Prize"}{" "}
              · Draw #{latestWinner.drawOrder}
            </p>
            {latestWinner.phoneLast4 && (
              <p className="text-sm text-stone-400">
                Phone ending: {latestWinner.phoneLast4}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Completed */}
      {!loading && drawComplete && (
        <div className="panel p-8 text-center border border-green-500/30">
          <Trophy size={55} className="gold mx-auto mb-4" />
          <h2 className="text-3xl font-black text-green-400">
            All 13 Winners Selected!
          </h2>
          <p className="text-stone-400 mt-3">
            The lucky draw is complete. All prizes have been assigned.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="panel p-4 border border-red-500/30 text-red-400">
          <div className="flex items-start gap-2">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Summary({ title, value, icon }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between text-stone-400">
        <p className="text-sm">{title}</p>
        {icon}
      </div>
      <p className="text-3xl font-black gold mt-3">{value}</p>
    </div>
  );
}
