
import { Link, NavLink } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <>
      <header className="border-b border-amber-300/20 bg-black/60">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-5">

          {/* Title and Subtitle */}
          <Link
            to="/"
            className="text-xl font-black tracking-wide text-center md:text-left"
          >
            <span className="gold">Fishing Tackle Store</span>
            <span className="text-xs text-amber-100/60 block tracking-[.25em] mt-1">
              LIVE LUCKY DRAW
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex flex-wrap justify-center items-center gap-x-5 gap-y-3 text-sm text-stone-300">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/participants">Participants</NavLink>
            <NavLink to="/winners">Winners</NavLink>
            <NavLink to="/live">Live Draw</NavLink>
          </nav>

        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-10 min-h-[75vh]">
        {children}
      </main>

      <footer className="text-center text-xs text-stone-500 border-t border-white/10 py-6">
        © {new Date().getFullYear()} Fishing Tackle Store · Made in Nepal,
        supported in Nepal
      </footer>
    </>
  );
}
