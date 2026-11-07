
import { useState } from "react";
import { api } from "../../services/api";
import { RotateCcw, Loader2 } from "lucide-react";

export default function ResetDrawButton() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleReset = async () => {
        const confirmed = window.confirm(
            "WARNING!\n\nThis will permanently delete all previous winners and reset every prize.\n\nParticipants and prize details will remain unchanged.\n\nAre you sure you want to reset the entire draw?"
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            setMessage("");

            const data = await api("/draw/reset", {
                method: "POST",
                auth: true,
            });

            setMessage(data.message);

            alert(
                `Draw reset successfully!\n\nWinners deleted: ${data.deletedWinners}\nPrizes reset: ${data.resetPrizes}`
            );

            // Refresh admin panel
            window.location.reload();

        } catch (error) {
            setMessage(error.message || "Failed to reset draw.");
            alert(error.message || "Failed to reset draw.");

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel p-5 border border-red-500/30">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

                <div>
                    <h3 className="text-lg font-bold text-red-400">
                        Reset Entire Draw
                    </h3>

                    <p className="text-sm text-stone-400 mt-1">
                        Delete previous winners and make all prizes available again.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Resetting...
                        </>
                    ) : (
                        <>
                            <RotateCcw size={18} />
                            Reset Draw
                        </>
                    )}
                </button>

            </div>

            {message && (
                <p className="text-sm text-stone-300 mt-3">
                    {message}
                </p>
            )}

        </div>
    );
}
