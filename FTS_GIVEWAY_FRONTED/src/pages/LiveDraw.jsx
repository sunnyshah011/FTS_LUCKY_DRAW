
import { useEffect, useState } from "react";
import { subscribeWinners } from "../services/drawService";

export default function LiveDraw() {
    const [winners, setWinners] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = subscribeWinners(
            setWinners,
            (err) => setError(err.message || "Unable to load winners.")
        );

        return () => unsubscribe();
    }, []);

    const latestWinner = winners[winners.length - 1];

    return (
        <section className="text-center">
            <p className="gold uppercase tracking-[.3em] text-xs">
                Khushi Bazar Event
            </p>

            <h1 className="text-4xl md:text-5xl font-black mt-3">
                Live <span className="gold">Lucky Draw</span>
            </h1>

            <p className="text-stone-400 mt-3">
                When the administrator publishes a result, it will appear here
                automatically.
            </p>

            <div className="panel max-w-2xl mx-auto p-8 mt-10">
                <div className="text-sm text-stone-400">
                    ANNOUNCED WINNERS
                </div>

                <div className="text-6xl gold font-black my-5">
                    {String(winners.length).padStart(2, "0")}
                    <span className="text-lg text-stone-400"> / 13</span>
                </div>

                {error ? (
                    <p className="text-red-400">{error}</p>
                ) : latestWinner ? (
                    <div className="text-stone-300">
                        {latestWinner.name} · Number {latestWinner.luckyNumber}
                    </div>
                ) : (
                    <div className="text-stone-300">
                        The live draw has not started yet.
                    </div>
                )}
            </div>
        </section>
    );
}
