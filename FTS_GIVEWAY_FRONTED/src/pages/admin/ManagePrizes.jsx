import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { Plus, Pencil, Trash2, X, Gift } from "lucide-react";

const prizesRef = collection(db, "prizes");

const emptyForm = {
  name: "",
  description: "",
  category: "main",
  imageUrl: "",
};

export default function ManagePrizes() {
  const [prizes, setPrizes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      prizesRef,
      (snapshot) => {
        setPrizes(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Unable to load prizes.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const sortedPrizes = [...prizes].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category === "main" ? -1 : 1;
    }
    return (a.sequence ?? 999) - (b.sequence ?? 999);
  });

  const mainPrizes = sortedPrizes.filter((p) => p.category === "main");
  const smallPrizes = sortedPrizes.filter((p) => p.category === "small");

  const mainCount = mainPrizes.length;
  const smallCount = smallPrizes.length;

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEditForm(prize) {
    setForm({
      name: prize.name || "",
      description: prize.description || "",
      category: prize.category || "main",
      imageUrl: prize.imageUrl || "",
    });
    setEditingId(prize.id);
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter a prize name.");
      return;
    }

    const categoryPrizes = prizes.filter(
      (p) => p.category === form.category && p.id !== editingId,
    );

    const limit = form.category === "main" ? 3 : 10;

    if (categoryPrizes.length >= limit) {
      setError(`You can add only ${limit} ${form.category} prizes.`);
      return;
    }

    setSaving(true);

    try {
      const prizeData = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        imageUrl: form.imageUrl.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "prizes", editingId), prizeData);
      } else {
        const nextSequence =
          categoryPrizes.length > 0
            ? Math.max(...categoryPrizes.map((p) => p.sequence || 0)) + 1
            : 1;

        await addDoc(prizesRef, {
          ...prizeData,
          sequence: nextSequence,
          drawn: false,
          createdAt: serverTimestamp(),
        });
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError("Unable to save prize. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(prize) {
    if (prize.drawn || prize.winnerId) {
      setError("This prize has already been awarded and cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${prize.name}"?`,
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "prizes", prize.id));
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to delete prize.");
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">
            Manage <span className="gold">Prizes</span>
          </h1>
          <p className="text-stone-400 mt-2">
            Manage all 13 prizes in their draw sequence.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Add Prize
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 my-7">
        <Summary title="Total Prizes" count={`${prizes.length}/13`} />
        <Summary title="Main Prizes" count={`${mainCount}/3`} />
        <Summary title="Small Prizes" count={`${smallCount}/10`} />
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="panel p-6 mb-7 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              {editingId ? "Edit Prize" : "Add New Prize"}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-stone-400"
            >
              <X size={20} />
            </button>
          </div>

          <div>
            <label className="block text-sm mb-2">Prize Name</label>
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter prize name"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Description</label>
            <textarea
              className="field min-h-24"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Enter prize description"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Prize Category</label>
            <select
              className="field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              disabled={Boolean(editingId)}
            >
              <option value="main">Main Prize</option>
              <option value="small">Small Prize</option>
            </select>
            {editingId && (
              <p className="text-xs text-stone-500 mt-1">
                Category cannot be changed while editing.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-2">Image URL (Optional)</label>
            <input
              className="field"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://example.com/prize.jpg"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? "Saving..." : editingId ? "Update Prize" : "Save Prize"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-stone-400">Loading prizes...</p>
      ) : prizes.length === 0 ? (
        <div className="panel p-10 text-center">
          <Gift size={40} className="gold mx-auto mb-3" />
          <p className="text-stone-300">No prizes added yet.</p>
          <p className="text-sm text-stone-500 mt-1">
            Add your first prize to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <PrizeSection
            title="Main Prizes"
            prizes={mainPrizes}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />

          <PrizeSection
            title="Small Prizes"
            prizes={smallPrizes}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />
        </div>
      )}
    </section>
  );
}

function PrizeSection({ title, prizes, onEdit, onDelete }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {prizes.map((prize) => (
          <div key={prize.id} className="panel p-5">
            {prize.imageUrl && (
              <img
                src={prize.imageUrl}
                alt={prize.name}
                className="w-full h-40 object-contain rounded-lg mb-4 bg-white/5"
              />
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs gold uppercase font-bold">{title}</span>
              <span className="text-xs bg-white/10 px-3 py-1 rounded-full">
                Draw #{prize.sequence ?? "—"}
              </span>
            </div>

            <h3 className="text-xl font-bold mt-2">{prize.name}</h3>

            <p className="text-sm text-stone-400 mt-2">
              {prize.description || "No description provided."}
            </p>

            {prize.drawn && (
              <p className="text-xs text-green-400 mt-3">Already awarded</p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => onEdit(prize)}
                className="flex-1 border border-white/10 rounded-lg py-2 flex items-center justify-center gap-2"
              >
                <Pencil size={15} /> Edit
              </button>

              <button
                onClick={() => onDelete(prize)}
                disabled={prize.drawn || Boolean(prize.winnerId)}
                className="border border-red-500/30 text-red-400 rounded-lg px-4 disabled:opacity-30"
                title="Delete prize"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Summary({ title, count }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-stone-400">{title}</p>
      <p className="text-3xl font-black gold mt-2">{count}</p>
    </div>
  );
}
