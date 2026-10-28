import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="dashboard-shell min-h-screen bg-[#F5F3EE] text-brand-text">
    <Header />
    <main className="min-w-0 px-4 pb-28 pt-7 sm:px-8 lg:ml-60 lg:pb-10 lg:pt-9"><div className="mx-auto w-full max-w-[1440px]">{children}</div></main>
    <BottomNav />
  </div>;
}
