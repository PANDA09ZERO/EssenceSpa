import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import DashboardAccess from "@/components/layout/DashboardAccess";
import InstallSystem from "@/components/layout/InstallSystem";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardAccess><div className="dashboard-shell min-h-screen bg-[#F5F3EE] text-brand-text">
    <Header />
    <main className="min-w-0 px-4 pb-28 pt-7 sm:px-8 lg:ml-60 lg:pb-10 lg:pt-9"><div className="mx-auto w-full max-w-[1440px]"><InstallSystem />{children}</div></main>
    <BottomNav />
  </div></DashboardAccess>;
}
