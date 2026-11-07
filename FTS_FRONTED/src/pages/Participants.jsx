import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { subscribeParticipants } from "../services/participantService";

export default function Participants() {
  const [rows, setRows] = useState([]);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeParticipants(
      (data) => {
        setRows(data);
        setLoading(false);
      },
      (error) => {
        console.error("Unable to load participants:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const search = term.trim().toLowerCase();

    return rows.filter((p) =>
      `${p.name} ${p.phoneLast4 || ""} ${p.luckyNumber}`
        .toLowerCase()
        .includes(search),
    );
  }, [rows, term]);

  return (
    <section>
      <h1 className="text-3xl font-black">
        Participant <span className="gold">List</span>
      </h1>

      <p className="text-stone-400 mt-2">
        Search using your name, last four phone digits, or lucky number. Full
        phone numbers and addresses remain private.
      </p>

      {/* Search */}
      <div className="relative max-w-md my-6">
        <Search className="absolute left-3 top-3 text-stone-500" size={18} />

        <input
          className="field pl-10"
          placeholder="Search name, phone digits or lucky number..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      {/* Participant list */}
      {loading ? (
        <p className="text-stone-400">Loading participants...</p>
      ) : (
        <div className="panel overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[minmax(0,1fr)_85px_95px] sm:grid-cols-[minmax(0,1fr)_110px_120px] gap-2 bg-white/5 p-4 text-xs sm:text-sm gold font-bold">
            <span>Participant</span>
            <span>Phone</span>
            <span>Lucky Number</span>
          </div>

          {/* Participant rows */}
          {filtered.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_85px_95px] sm:grid-cols-[minmax(0,1fr)_110px_120px] gap-2 p-4 border-t border-white/5 text-xs sm:text-sm items-center"
            >
              <span className="font-medium break-words">{p.name}</span>

              <span className="text-stone-400 font-mono">
                {p.phoneLast4 || "----"}
              </span>

              <b className="gold font-bold">
                {String(p.luckyNumber).padStart(3, "0")}
              </b>
            </div>
          ))}

          {!filtered.length && (
            <p className="p-6 text-stone-400">
              {rows.length
                ? "No matching participant found."
                : "Participant list will appear when participants are registered."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
