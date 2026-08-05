import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import TopBar from "@/app/components/TopBar";

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
