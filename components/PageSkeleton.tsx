// Esqueletos de carga por página (los usan los loading.tsx). El topbar real
// persiste durante la navegación (layout compartido no se re-monta), esto
// reemplaza solo el contenido — la sensación es "respondió al toque".

function Bar({ w, h = 14, mb = 0 }: { w: number | string; h?: number; mb?: number }) {
  return <div className="skel" style={{ width: w, height: h, marginBottom: mb }} />;
}

export function DashboardSkeleton() {
  return (
    <main className="page" aria-busy="true" aria-label="Cargando el panel">
      <div style={{ padding: "28px 0" }}>
        <Bar w={220} h={20} />
      </div>
      <Bar w={320} h={34} mb={10} />
      <Bar w={200} h={12} mb={24} />
      <section className="kpi-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel-card">
            <Bar w={90} h={30} mb={8} />
            <Bar w={130} h={12} />
          </div>
        ))}
      </section>
      <section className="panel-grid">
        <div className="skel-card" style={{ minHeight: 320 }}>
          <Bar w={160} h={15} mb={18} />
          <div className="skel" style={{ width: 190, height: 190, borderRadius: "50%", margin: "10px auto" }} />
        </div>
        <div className="skel-card" style={{ minHeight: 320 }}>
          <Bar w={120} h={15} mb={18} />
          <Bar w={140} h={34} mb={14} />
          <Bar w="100%" h={8} mb={22} />
          <Bar w="70%" h={16} mb={10} />
          <Bar w="55%" h={16} mb={10} />
          <Bar w="62%" h={16} />
        </div>
        <div className="skel-card" style={{ gridColumn: "1 / -1", minHeight: 220 }}>
          <Bar w={230} h={15} mb={18} />
          {[85, 70, 58, 44, 30].map((w, i) => (
            <Bar key={i} w={`${w}%`} h={18} mb={10} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function ListSkeleton({ title = 200 }: { title?: number }) {
  return (
    <main className="page" aria-busy="true" aria-label="Cargando">
      <div style={{ padding: "28px 0" }}>
        <Bar w={220} h={20} />
      </div>
      <Bar w={title} h={34} mb={10} />
      <Bar w={300} h={13} mb={24} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="skel-card" style={{ marginBottom: 12, display: "flex", gap: 20, alignItems: "center" }}>
          <Bar w={40} h={24} />
          <div style={{ flex: 1 }}>
            <Bar w="45%" h={16} mb={8} />
            <Bar w="70%" h={12} />
          </div>
          <Bar w={50} h={14} />
        </div>
      ))}
    </main>
  );
}
