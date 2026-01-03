"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace(`/employees/${user.id}`);
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
}
