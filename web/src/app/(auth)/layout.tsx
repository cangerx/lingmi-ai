export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-page)] relative overflow-hidden">
      {/* Ambient gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-200/40 to-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-pink-200/30 to-orange-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-gradient-to-br from-cyan-200/20 to-teal-200/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
