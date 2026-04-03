"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Loader2 } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, userTeams } = useAuth();
  const router = useRouter();

  // Check if user has admin access (is chair of any society OR member of admins team)
  const hasAdminAccess = userTeams.some(
    (team) =>
      team.$id === "admins" ||
      team.name?.toLowerCase() === "admins" ||
      team.$id?.startsWith("chair_") ||
      team.name?.toLowerCase().startsWith("chair_"),
  );

  // Debug logging
  useEffect(() => {
    if (user && !loading) {
      // Log the raw data so you can see exactly what Appwrite provides
      console.log("Raw userTeams data:", userTeams);

      console.log("Admin auth check:", {
        user: user.email,
        // Notice the $id and name here!
        teams: userTeams.map((t) => ({ id: t.$id, name: t.name })),
        hasAdminAccess,
      });
    }
  }, [user, loading, userTeams, hasAdminAccess]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/events?login=required");
        return;
      }
      if (!hasAdminAccess) {
        router.push("/events?error=unauthorized");
        return;
      }
    }
  }, [user, loading, hasAdminAccess, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ieee-blue animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authorized
  if (!user || !hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ieee-blue animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#333",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            borderRadius: "12px",
            padding: "16px",
          },
          success: {
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="lg:pl-64">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
