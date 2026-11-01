"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminPlansRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/super-admin?tab=plans");
  }, [router]);

  return null;
}
