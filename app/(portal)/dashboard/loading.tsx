import { DashboardSkeleton } from "@/components/PageSkeleton";

// Al navegar al panel, Next muestra esto al instante mientras el server consulta.
export default function Loading() {
  return <DashboardSkeleton />;
}
