import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Trophy, Gift, Sparkles, Users, Phone } from "lucide-react";

import { db } from "../services/firebase";
import { subscribeWinners } from "../services/drawService";

export default function LiveDraw() {
  const [winners, setWinners] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let winnersLoaded = false;
    let prizesLoaded = false;

    const checkLoaded = () => {
      if (winnersLoaded && prizesLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeWinners = subscribeWinners(
      (data) => {
        setWinners(data);
        winnersLoaded = true;
        checkLoaded();
      },
      (err) => {
        console.error("Winner listener:", err);
        setError(err.message || "Unable to load winners.");
        winnersLoaded = true;
        checkLoaded();
      },
    );

    const unsubscribePrizes = onSnapshot(
      collection(db, "prizes"),
      (snapshot) => {
        setPrizes(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })),
        );
        prizesLoaded = true;
        checkLoaded();
      },
      (err) => {
        console.error("Prize listener:", err);
        setError("Unable to load prize information.");
        prizesLoaded = true;
        checkLoaded();
      },
    );

    return () => {
      unsubscribeWinners();
      unsubscribePrizes();
    };
  }, []);

  const sortedWinners = useMemo(
    () => [...winners].sort((a, b) => (a.drawOrder || 0) - (b.drawOrder || 0)),
    [winners],
  );

  const latestWinner = sortedWinners[sortedWinners.length - 1];

  const prizeMap = useMemo(
    () => new Map(prizes.map((prize) => [prize.id, prize])),
    [prizes],
  );

  const progress = Math.min(sortedWinners.length, 13);
  const completed = progress === 13;

  return (
    <section className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <p className="gold uppercase tracking-[.3em] text-xs">
          Khushi Bazar Event
        </p>

        <h1 className="text-4xl md:text-5xl font-black mt-3">
          Live <span className="gold">Lucky Draw</span>
        </h1>

        <p className="text-stone-400 mt-3">
          Watch the lucky winners and their prizes announced live.
        </p>
      </div>

      {/* Winner progress */}
      <div className="panel max-w-3xl mx-auto p-6 mt-10">
        <div className="flex justify-between items-center gap-4">
          <div>
            <p className="text-sm text-stone-400">ANNOUNCED WINNERS</p>

            <p className="text-5xl gold font-black mt-2">
              {String(progress).padStart(2, "0")}
              <span className="text-lg text-stone-400"> / 13</span>
            </p>
          </div>

          <Trophy size={42} className="gold" />
        </div>

        <div className="h-3 bg-white/10 rounded-full overflow-hidden mt-5">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all duration-700"
            style={{ width: `${(progress / 13) * 100}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-stone-500 mt-2">
          <span>Lucky draw progress</span>
          <span>{13 - progress} winners remaining</span>
        </div>
      </div>

      {error && (
        <div className="panel max-w-3xl mx-auto mt-6 p-4 border border-red-500/30">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="panel max-w-3xl mx-auto mt-8 p-10 text-center">
          <p className="text-stone-400">Loading live draw information...</p>
        </div>
      ) : (
        <>
          {/* Latest winner */}
          {latestWinner ? (
            <div className="panel max-w-3xl mx-auto mt-8 p-7 md:p-10 text-center border border-yellow-500/30">
              <Sparkles size={38} className="gold mx-auto mb-4" />

              <p className="gold uppercase tracking-[.2em] text-xs font-bold">
                {completed ? "All Winners Announced" : "Latest Lucky Winner"}
              </p>

              <h2 className="text-3xl md:text-4xl font-black mt-4">
                {latestWinner.name}
              </h2>

              <p className="text-stone-400 mt-3">Winning Lucky Number</p>

              <p className="text-6xl md:text-7xl gold font-black mt-2">
                {latestWinner.luckyNumber}
              </p>

              <div className="mt-7 bg-white/5 rounded-xl p-5 max-w-md mx-auto">
                {prizeMap.get(latestWinner.prizeId)?.imageUrl && (
                  <img
                    src={prizeMap.get(latestWinner.prizeId).imageUrl}
                    alt={latestWinner.prizeName}
                    className="w-full h-44 object-contain mb-4"
                  />
                )}

                <div className="flex justify-center items-center gap-2 gold">
                  <Gift size={20} />
                  <span className="font-bold uppercase text-xs tracking-wider">
                    {latestWinner.category === "main"
                      ? "Main Prize"
                      : "Small Prize"}
                  </span>
                </div>

                <h3 className="text-xl font-bold mt-2">
                  {latestWinner.prizeName}
                </h3>

                <p className="text-sm text-stone-400 mt-2">
                  Draw #{latestWinner.drawOrder}
                </p>

                {latestWinner.phoneLast4 && (
                  <p className="text-sm text-stone-400 mt-3">
                    <Phone size={14} className="inline mr-2" />
                    Phone ending: {latestWinner.phoneLast4}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="panel max-w-3xl mx-auto mt-8 p-10 text-center">
              <Gift size={45} className="gold mx-auto mb-4" />

              <h2 className="text-2xl font-bold">
                The Lucky Draw Has Not Started
              </h2>

              <p className="text-stone-400 mt-3">
                Stay tuned! The first lucky winner will be announced here.
              </p>
            </div>
          )}

          {/* All winners */}
          <div className="mt-12">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-black">
                  Lucky <span className="gold">Winners</span>
                </h2>
                <p className="text-sm text-stone-400 mt-1">
                  Official announced winners
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-stone-400">
                <Users size={18} />
                {progress} / 13
              </div>
            </div>

            {sortedWinners.length === 0 ? (
              <div className="panel p-8 text-center text-stone-400">
                No winners announced yet.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedWinners.map((winner) => {
                  const prize = prizeMap.get(winner.prizeId);

                  return (
                    <div key={winner.id} className="panel p-5">
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-xs gold uppercase font-bold">
                          {winner.category === "main"
                            ? "Main Prize"
                            : "Small Prize"}
                        </span>

                        <span className="text-xs text-stone-500">
                          Draw #{winner.drawOrder}
                        </span>
                      </div>

                      {prize?.imageUrl && (
                        <img
                          src={
                            latestWinner.prizeImageUrl ||
                            prizeMap.get(latestWinner.prizeId)?.imageUrl
                          }
                          alt={latestWinner.prizeName}
                          className="w-full h-44 object-contain mb-4"
                        />
                      )}

                      <div className="flex items-center gap-3 mt-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                          <Trophy size={19} className="gold" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold truncate">{winner.name}</h3>

                          <p className="text-xs text-stone-400 mt-1">
                            Lucky Number:{" "}
                            <span className="gold font-bold">
                              {winner.luckyNumber}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-white/10 mt-4 pt-3">
                        <p className="text-sm font-medium">
                          {winner.prizeName}
                        </p>

                        {winner.phoneLast4 && (
                          <p className="text-xs text-stone-500 mt-2">
                            Phone ending: {winner.phoneLast4}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
