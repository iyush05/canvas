export default function RoomLoading() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-[#1a1a2e]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Loading canvas…</p>
      </div>
    </div>
  );
}
