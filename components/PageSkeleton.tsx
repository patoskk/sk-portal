// Esqueletos de carga por página (los usan los loading.tsx). El sidebar real
// persiste durante la navegación —vive en app/(portal)/layout.tsx, que no se
// re-monta—, así que esto reemplaza solo el contenido: la sensación es
// "respondió al toque".

function Bar({ w, h = 14, mb = 0 }: { w: number | string; h?: number; mb?: number }) {
  return <div className="skel" style={{ width: w, height: h, marginBottom: mb }} />;
}

export function DashboardSkeleton() {
  return (
    <main className="page" aria-busy="true" aria-label="Cargando el panel">
      <div className="page-head">
        <Bar w={140} h={12} mb={10} />
        <Bar w={320} h={34} mb={10} />
        <Bar w={260} h={13} />
      </div>
      {/* mismo reparto que el Panel: destacada + tres tiles */}
      <section className="hero-grid">
        <div className="skel-card" style={{ padding: 24 }}>
          <Bar w={90} h={12} mb={12} />
          <Bar w={160} h={46} mb={16} />
          <Bar w="70%" h={13} mb={10} />
          <Bar w="100%" h={8} mb={14} />
          <Bar w="100%" h={40} />
        </div>
        <div className="stat-col">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel-card" style={{ padding: "16px 18px" }}>
              <Bar w={80} h={25} mb={6} />
              <Bar w={120} h={12} />
            </div>
          ))}
        </div>
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

// Beneficios: dos bloques altos (consultoría + referidos), no una lista de filas.
export function BlocksSkeleton() {
  return (
    <main className="page" aria-busy="true" aria-label="Cargando">
      <div className="page-head">
        <Bar w={340} h={34} mb={10} />
        <Bar w={380} h={13} />
      </div>
      <div className="skel" style={{ height: 300, borderRadius: 16, marginBottom: 22 }} />
      <div className="skel" style={{ height: 210, borderRadius: 16 }} />
    </main>
  );
}

export function ListSkeleton({ title = 200 }: { title?: number }) {
  return (
    <main className="page" aria-busy="true" aria-label="Cargando">
      <div className="page-head">
        <Bar w={title} h={34} mb={10} />
        <Bar w={300} h={13} />
      </div>
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
