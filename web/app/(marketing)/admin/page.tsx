import dynamic from "next/dynamic";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

const AdminDashboardClient = dynamic(
  () =>
    import("@/components/admin/AdminDashboardClient").then(
      (m) => m.AdminDashboardClient
    ),
  { ssr: false }
);

export default function AdminPage() {
  return (
    <div className="marketing-stable py-8 sm:py-12">
      <AdminDashboardClient />
    </div>
  );
}
