import { BrandFooter } from '../components/ui/BrandFooter';

const examples = [
  {
    tag: 'Esmalteria & Gel',
    name: 'Nails Studio',
    desc: 'Unhas perfeitas para cada ocasião',
    banner: '/img/unhas.png',
    href: '/example-m',
    accent: '#f472b6',
    glow: 'rgba(244,114,182,0.55)',
  },
  {
    tag: 'Cabelos & Finalização',
    name: 'Salão Completo',
    desc: 'Do corte ao acabamento impecável',
    banner: '/img/cabelos.png',
    href: '/example-s',
    accent: '#c084fc',
    glow: 'rgba(192,132,252,0.55)',
  },
];

export default function ExamplePage() {
  return (
    <div
      className="auralynne-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px 36px',
      }}
    >
      <style>{`
        .ex-card {
          position: relative;
          border-radius: 26px;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          display: block;
          transform: translateY(0);
          transition: transform 0.22s cubic-bezier(.22,1,.36,1), box-shadow 0.22s ease;
        }
        .ex-card:hover {
          transform: translateY(-6px) scale(1.015);
        }
        .ex-card-img {
          width: 100%;
          height: 280px;
          object-fit: cover;
          display: block;
          transition: transform 0.4s cubic-bezier(.22,1,.36,1);
        }
        .ex-card:hover .ex-card-img {
          transform: scale(1.06);
        }
        .ex-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10,5,15,0.08) 0%,
            rgba(10,5,15,0.15) 35%,
            rgba(10,5,15,0.72) 72%,
            rgba(10,5,15,0.88) 100%
          );
        }
        .ex-card-body {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 20px 22px 24px;
        }
        .ex-tag {
          display: inline-block;
          border-radius: 99px;
          padding: 4px 13px;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
          color: #fff;
        }
        .ex-name {
          font-family: "Cambria", "Cochin", "Georgia", serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.15;
          margin: 0 0 4px;
          text-shadow: 0 2px 12px rgba(0,0,0,0.45);
        }
        .ex-desc {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.72);
          margin: 0 0 16px;
          font-weight: 400;
          letter-spacing: 0.01em;
        }
        .ex-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          color: #fff;
          letter-spacing: 0.03em;
          border: none;
          cursor: pointer;
          transition: filter 0.18s ease, gap 0.18s ease;
        }
        .ex-card:hover .ex-cta {
          filter: brightness(1.12);
          gap: 10px;
        }
        .ex-shine {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%);
          pointer-events: none;
          border-radius: 26px 26px 0 0;
          transition: opacity 0.22s ease;
          opacity: 0;
        }
        .ex-card:hover .ex-shine { opacity: 1; }
      `}</style>

      {/* Logo hero */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <img
          src="/img/0a9de795-2aa3-4b77-90eb-af8722986f81.png"
          alt="Logo Auralynne"
          className="auralynne-hero-logo"
          style={{ marginBottom: 16 }}
        />
        <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: '0.9rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: 0,
          fontWeight: 500,
        }}>
          Escolha um estilo e teste o agendamento
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 24,
        width: '100%',
        maxWidth: 580,
        marginTop: 40,
      }}>
        {examples.map((ex) => (
          <a
            key={ex.name}
            href={ex.href}
            className="ex-card"
            style={{ boxShadow: `0 20px 50px ${ex.glow}, 0 6px 18px rgba(0,0,0,0.22)` }}
          >
            <img src={ex.banner} alt={ex.name} className="ex-card-img" />
            <div className="ex-card-overlay" />
            <div className="ex-shine" />

            <div className="ex-card-body">
              <span className="ex-tag" style={{ background: ex.accent }}>
                {ex.tag}
              </span>
              <p className="ex-name">{ex.name}</p>
              <p className="ex-desc">{ex.desc}</p>
              <span className="ex-cta" style={{ background: ex.accent, boxShadow: `0 6px 18px ${ex.glow}` }}>
                Ver vitrine <span style={{ fontSize: '1rem', lineHeight: 1 }}>→</span>
              </span>
            </div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 44 }}>
        <BrandFooter />
      </div>
    </div>
  );
}
