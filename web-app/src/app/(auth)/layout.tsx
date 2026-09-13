export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-zinc-900">
      {children}
    </div>
  );
}
