import OptionList from "./components/optionList";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:py-32">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-7xl">
            Master the{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Game
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-400 sm:text-xl">
            The ultimate platform to play, learn, and improve your chess skills.
            Choose your path and start your journey today.
          </p>
        </div>

        <OptionList />
      </div>

      {/* Subtle footer or bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none" />
    </main>
  );
}
