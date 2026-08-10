"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="danger" onClick={logout} disabled={loading}>
      <LogOut size={16} strokeWidth={1.9} />
      {loading ? "Saliendo…" : "Cerrar sesión"}
    </Button>
  );
}
