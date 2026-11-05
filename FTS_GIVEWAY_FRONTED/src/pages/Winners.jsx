import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Trophy, Gift, Phone, Users } from "lucide-react";

import { db } from "../services/firebase";
import { subscribeWinners } from "../services/drawService";

export default function Winners() {
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
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
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

  const prizeMap = useMemo(
    () => new Map(prizes.map((prize) => [prize.id, prize])),
    [prizes],
  );

  return (
    <section className="max-w-6xl mx-auto">
      {/* Heading */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <p className="gold uppercase tracking-[.25em] text-xs">
            Khushi Bazar Event
          </p>

          <h1 className="text-3xl md:text-4xl font-black mt-3">
            Lucky <span className="gold">Winners</span>
          </h1>

          <p className="text-stone-400 mt-2">Official winner announcements.</p>
        </div>

        <div className="panel px-5 py-3 flex items-center gap-3">
          <Users size={22} className="gold" />
          <div>
            <p className="text-2xl font-black gold">
              {sortedWinners.length} / 13
            </p>
            <p className="text-xs text-stone-400">Announced winners</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="panel p-4 mb-6 border border-red-500/30">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="panel p-10 text-center text-stone-400">
          Loading winners...
        </div>
      ) : sortedWinners.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedWinners.map((winner) => {
            const prize = prizeMap.get(winner.prizeId);

            return (
              <article key={winner.id} className="panel p-5 overflow-hidden">
                {/* Prize category and draw number */}
                <div className="flex justify-between items-center gap-2">
                  <span className="gold text-xs font-bold uppercase tracking-wider">
                    {winner.category === "main" ? "Main Prize" : "Small Prize"}
                  </span>

                  <span className="text-xs text-stone-500">
                    Draw #{winner.drawOrder}
                  </span>
                </div>

                {/* Prize image */}
                {prize?.imageUrl ? (
                  <div className="h-48 flex items-center justify-center mt-4 bg-white/5 rounded-xl p-3">
                    <img
                      src={winner.prizeImageUrl || prize?.imageUrl}
                      alt={winner.prizeName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center mt-4 bg-white/5 rounded-xl">
                    <Gift size={55} className="gold opacity-70" />
                  </div>
                )}

                {/* Prize name */}
                <div className="mt-5">
                  <p className="text-xs text-stone-500 uppercase">Prize Won</p>

                  <h2 className="text-lg font-bold mt-1">
                    {winner.prizeName || "Lucky Prize"}
                  </h2>
                </div>

                <div className="border-t border-white/10 mt-4 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Trophy size={21} className="gold" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-stone-500">Winner</p>

                      <h3 className="font-bold text-lg truncate">
                        {winner.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center gap-3">
                    <div>
                      <p className="text-xs text-stone-500">Lucky Number</p>

                      <p className="text-2xl gold font-black mt-1">
                        {winner.luckyNumber}
                      </p>
                    </div>

                    {winner.phoneLast4 && (
                      <div className="text-right">
                        <p className="text-xs text-stone-500">Phone ending</p>

                        <p className="text-sm font-semibold mt-2">
                          <Phone size={13} className="inline mr-1" />
                          {winner.phoneLast4}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel p-12 text-center">
          <Trophy size={48} className="gold mx-auto mb-5" />

          <h2 className="text-xl font-bold">No Winners Announced Yet</h2>

          <p className="text-stone-400 mt-2">
            Stay tuned! The official lucky draw results will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
