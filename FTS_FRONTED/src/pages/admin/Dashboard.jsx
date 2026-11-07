
import { Link } from "react-router-dom";
import { Upload, Users, Trophy, Radio, Trash2 } from "lucide-react";

const links = [
  ["Import customers", "/admin/import", Upload],
  ["Manage participants", "/admin/participants", Users],
  ["Manage prizes", "/admin/prizes", Trophy],
  ["Draw control", "/admin/draw", Radio],
  ["Reset entire draw", "/admin/draw/reset", Trash2],
];

export default function Dashboard() {
  return (
    <section>
      <h1 className="text-3xl font-bold">
        Admin <span className="gold">Dashboard</span>
      </h1>

      <p className="text-stone-400 mt-2 mb-7">
        Manage the lucky draw event.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {links.map(([label, to, Icon]) => (
          <Link
            className="panel p-6 flex items-center gap-4 hover:border-amber-300"
            to={to}
            key={to}
          >
            <Icon className="gold" />
            <b>{label}</b>
          </Link>
        ))}
      </div>
    </section>
  );
}
