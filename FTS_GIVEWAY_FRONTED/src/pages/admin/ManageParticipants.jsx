
import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { subscribeParticipants } from "../../services/participantService";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function ManageParticipants() {
    const [participants, setParticipants] = useState([]);
    const [privateDetails, setPrivateDetails] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let publicLoaded = false;
        let privateLoaded = false;

        const checkLoading = () => {
            if (publicLoaded && privateLoaded) setLoading(false);
        };

        const unsubscribePublic = subscribeParticipants(
            (data) => {
                setParticipants(data);
                publicLoaded = true;
                checkLoading();
            },
            (err) => {
                console.error(err);
                setError("Unable to load participants.");
                setLoading(false);
            }
        );

        const unsubscribePrivate = onSnapshot(
            collection(db, "privateParticipants"),
            (snapshot) => {
                setPrivateDetails(
                    snapshot.docs.map((document) => ({
                        id: document.id,
                        ...document.data(),
                    }))
                );
                privateLoaded = true;
                checkLoading();
            },
            (err) => {
                console.error("Private participant details error:", err);
                setError("Unable to load private participant details. Check administrator permissions.");
                setLoading(false);
            }
        );

        return () => {
            unsubscribePublic();
            unsubscribePrivate();
        };
    }, []);

    const mergedParticipants = useMemo(() => {
        const privateMap = new Map(
            privateDetails.map((item) => [item.participantId, item])
        );

        return participants.map((participant) => ({
            ...participant,
            ...(privateMap.get(participant.id) || {}),
        }));
    }, [participants, privateDetails]);

    const filteredParticipants = useMemo(() => {
        const term = search.trim().toLowerCase();

        return mergedParticipants.filter((p) =>
            `${p.name} ${p.address || ""} ${p.phone || ""} ${p.luckyNumber}`
                .toLowerCase()
                .includes(term)
        );
    }, [mergedParticipants, search]);

    return (
        <section>
            <h1 className="text-3xl font-black">
                Manage <span className="gold">Participants</span>
            </h1>

            <p className="text-stone-400 mt-2">
                View participant names, addresses, phone numbers and lucky numbers.
            </p>

            <div className="panel p-5 mt-6 max-w-xs">
                <div className="flex items-center gap-3">
                    <Users className="gold" size={30} />
                    <div>
                        <p className="text-sm text-stone-400">Total Participants</p>
                        <p className="text-3xl font-black gold">
                            {participants.length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative max-w-md my-6">
                <Search className="absolute left-3 top-3 text-stone-500" size={18} />
                <input
                    className="field pl-10"
                    placeholder="Search name, address, phone or lucky number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="panel overflow-x-auto">
                <table className="w-full min-w-[750px] text-sm text-left">
                    <thead className="bg-white/5 gold">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Address</th>
                            <th className="p-4">Phone Number</th>
                            <th className="p-4">Lucky Number</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="p-6 text-stone-400">
                                    Loading participants...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="4" className="p-6 text-red-400">
                                    {error}
                                </td>
                            </tr>
                        ) : filteredParticipants.length > 0 ? (
                            filteredParticipants.map((p) => (
                                <tr key={p.id} className="border-t border-white/5">
                                    <td className="p-4 font-medium">{p.name}</td>
                                    <td className="p-4 text-stone-300">{p.address || "—"}</td>
                                    <td className="p-4 font-mono text-stone-300">
                                        {p.phone || "—"}
                                    </td>
                                    <td className="p-4 gold font-bold">
                                        {String(p.luckyNumber).padStart(3, "0")}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="p-6 text-stone-400">
                                    No matching participants found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
