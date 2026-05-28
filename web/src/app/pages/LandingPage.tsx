import { useState, useEffect } from 'react';
import { BrandFooter } from '../components/ui/BrandFooter';

const SERVICES = [
  {
    tag: 'Esmalteria & Gel',
    name: 'Nails Studio',
    desc: 'Unhas perfeitas para cada ocasião',
    banner: '/img/unhas.png',
    href: '/example-m',
    accent: '#f472b6',
    glow: 'rgba(244,114,182,0.5)',
  },
  {
    tag: 'Cabelos & Finalização',
    name: 'Salão Completo',
    desc: 'Do corte ao acabamento impecável',
    banner: '/img/cabelos.png',
    href: '/example-s',
    accent: '#c084fc',
    glow: 'rgba(192,132,252,0.5)',
  },
];

const FEATURES = [
  { icon: '📅', title: 'Agenda 24h', desc: 'Clientes agendam pelo celular a qualquer hora, sem ligação.' },
  { icon: '📱', title: 'Painel mobile', desc: 'Acompanhe tudo em tempo real direto no seu celular.' },
  { icon: '🔗', title: 'Link único', desc: 'Compartilhe nas redes e receba agendamentos na hora.' },
];

// ─── easeInOutCubic scroll ────────────────────────────────
function smoothScroll(targetY: number) {
  const startY = window.scrollY
  const diff = targetY - startY
  if (Math.abs(diff) < 2) return
  const duration = Math.min(Math.max(Math.abs(diff) * 0.55, 500), 950)
  const startTime = performance.now()

  function ease(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    window.scrollTo(0, startY + diff * ease(progress))
    if (progress < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

// ─── Main component ───────────────────────────────────────
export default function LandingPage() {
  const [activeSection, setActiveSection] = useState('inicio')

  // Track active section via IntersectionObserver
  useEffect(() => {
    const ids = ['inicio', 'servicos', 'sobre']
    const observers: IntersectionObserver[] = []

    ids.forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { threshold: 0.35, rootMargin: '-68px 0px 0px 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  // Fade + slide-up for elements with .lp-reveal
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal')
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-reveal-in')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '-30px 0px 0px 0px' }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  function navClick(id: string) {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      if (id === 'inicio') { smoothScroll(0); return }
      const el = document.getElementById(id)
      if (!el) return
      smoothScroll(el.getBoundingClientRect().top + window.scrollY - 76)
    }
  }

  return (
    <>
      <style>{`
        body { margin: 0; background: #0e0309; font-family: 'Inter', Arial, Helvetica, sans-serif; }

        /* ── Reveal animation ── */
        .lp-reveal {
          opacity: 0;
          transform: translateY(36px);
          transition: opacity 0.75s cubic-bezier(.22,1,.36,1),
                      transform 0.75s cubic-bezier(.22,1,.36,1);
        }
        .lp-reveal-in { opacity: 1; transform: translateY(0); }

        .lp-reveal-d1 { transition-delay: 80ms; }
        .lp-reveal-d2 { transition-delay: 180ms; }
        .lp-reveal-d3 { transition-delay: 280ms; }

        /* ── Nav ── */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 68px;
          background: rgba(14, 3, 9, 0.78);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .lp-nav-inner {
          max-width: 1440px; margin: 0 auto; height: 100%;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(20px, 4vw, 72px);
        }
        .lp-nav-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }
        .lp-nav-links {
          display: flex; align-items: center; gap: 38px;
          list-style: none; margin: 0; padding: 0;
        }
        .lp-nav-links a {
          position: relative;
          color: rgba(255,255,255,0.55); text-decoration: none;
          font-size: 0.78rem; font-weight: 700; letter-spacing: 0.09em;
          text-transform: uppercase; padding-bottom: 4px;
          transition: color 0.2s ease;
        }
        .lp-nav-links a::after {
          content: '';
          position: absolute; bottom: -2px; left: 50%; right: 50%;
          height: 2px; border-radius: 99px; background: #f472b6;
          transition: left 0.28s cubic-bezier(.22,1,.36,1),
                      right 0.28s cubic-bezier(.22,1,.36,1);
        }
        .lp-nav-links a:hover,
        .lp-nav-links a.lp-active { color: #fff; }
        .lp-nav-links a.lp-active::after { left: 0; right: 0; }

        /* ── Hero ── */
        .lp-hero {
          padding-top: 68px;
          background: linear-gradient(150deg, #0e0309 0%, #2a0d1d 55%, #160710 100%);
          overflow: hidden; position: relative;
        }
        .lp-hero-inner {
          max-width: 1440px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          min-height: calc(100vh - 68px);
          align-items: center;
        }
        .lp-hero-left {
          display: flex; flex-direction: column; justify-content: center;
          padding: clamp(40px,5vw,72px) clamp(28px,4vw,56px) clamp(40px,5vw,72px) clamp(40px,5vw,80px);
          position: relative; z-index: 2;
        }
        .lp-hero-right {
          position: relative; overflow: hidden;
          height: calc(100vh - 68px);
        }
        .lp-hero-right-img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: 60% 15%;
          display: block;
        }
        .lp-hero-right-fade {
          position: absolute; inset: 0;
          background: linear-gradient(
            to right,
            #0e0309 0%, rgba(14,3,9,0.3) 18%,
            transparent 55%,
            rgba(14,3,9,0.15) 85%, #0e0309 100%
          );
        }
        .lp-hero-right-fade-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; height: 220px;
          background: linear-gradient(to top, #0e0309 0%, transparent 100%);
        }

        /* ── Buttons ── */
        .lp-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #ef6f91 0%, #d6547a 100%);
          color: #fff; font-weight: 700; font-size: 0.9rem;
          padding: 14px 28px; border-radius: 14px; text-decoration: none;
          border: none; cursor: pointer; letter-spacing: 0.03em;
          box-shadow: 0 10px 32px rgba(239,111,145,0.42);
          transition: transform 0.18s ease, box-shadow 0.18s ease, gap 0.18s ease;
        }
        .lp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 44px rgba(239,111,145,0.54);
          gap: 12px;
        }
        .lp-btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; color: rgba(255,255,255,0.7);
          font-weight: 600; font-size: 0.88rem;
          padding: 14px 24px; border-radius: 14px; text-decoration: none;
          border: 1px solid rgba(255,255,255,0.18); cursor: pointer;
          transition: border-color 0.18s ease, color 0.18s ease;
        }
        .lp-btn-ghost:hover { border-color: rgba(244,114,182,0.5); color: #f472b6; }

        /* ── Service cards ── */
        .lp-svc-card {
          position: relative; border-radius: 26px; overflow: hidden;
          display: block; text-decoration: none;
          transition: transform 0.22s cubic-bezier(.22,1,.36,1), box-shadow 0.22s ease;
        }
        .lp-svc-card:hover { transform: translateY(-6px) scale(1.015); }
        .lp-svc-card-img {
          width: 100%; height: 280px; object-fit: cover; display: block;
          transition: transform 0.4s cubic-bezier(.22,1,.36,1);
        }
        .lp-svc-card:hover .lp-svc-card-img { transform: scale(1.06); }
        .lp-svc-card-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom,
            rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.12) 35%,
            rgba(0,0,0,0.72) 72%, rgba(0,0,0,0.88) 100%);
        }
        .lp-svc-card-shine {
          position: absolute; top: 0; left: 0; right: 0; height: 55%;
          background: linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%);
          opacity: 0; transition: opacity 0.22s ease;
          border-radius: 26px 26px 0 0; pointer-events: none;
        }
        .lp-svc-card:hover .lp-svc-card-shine { opacity: 1; }
        .lp-svc-card-body {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 22px 24px 26px;
        }
        .lp-svc-cta {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 11px; font-weight: 700;
          font-size: 0.82rem; color: #fff; border: none; cursor: pointer;
          transition: filter 0.18s ease, gap 0.18s ease;
        }
        .lp-svc-card:hover .lp-svc-cta { filter: brightness(1.14); gap: 10px; }

        /* ── Feature cards ── */
        .lp-feat-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 22px; padding: 30px 26px;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .lp-feat-card:hover {
          background: rgba(244,114,182,0.07);
          border-color: rgba(244,114,182,0.25);
          transform: translateY(-3px);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .lp-hero {
            background-image:
              linear-gradient(to bottom, rgba(14,3,9,0.72) 0%, rgba(14,3,9,0.55) 40%, rgba(14,3,9,0.88) 100%),
              url('/img/hero.png');
            background-size: cover;
            background-position: 68% center;
          }
          .lp-hero-inner { grid-template-columns: 1fr; min-height: 100svh; }
          .lp-hero-right { display: none; }
          .lp-hero-left {
            padding: clamp(32px,6vw,56px) clamp(20px,5vw,40px) clamp(40px,6vw,60px) !important;
          }
          .lp-nav-links { display: none; }
          .lp-svc-grid { grid-template-columns: 1fr !important; }
          .lp-feat-grid { grid-template-columns: 1fr !important; }
          .lp-stats-row { flex-direction: row !important; flex-wrap: nowrap !important; gap: 8px !important; }
          .lp-stat-card { padding: 10px 12px !important; flex: 1; min-width: 0; }
          .lp-stat-val { font-size: 1.1rem !important; }
          .lp-stat-label { font-size: 0.62rem !important; }
        }
      `}</style>

      {/* ─── Navbar ─── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <a href="#inicio" className="lp-nav-logo" onClick={navClick('inicio')}>
            <img
              src="/img/ico.png" alt="Auralynne"
              style={{ height: 38, width: 38, objectFit: 'contain', filter: 'brightness(1.15) saturate(1.1) drop-shadow(0 0 8px rgba(244,114,182,0.5))' }}
            />
            <span style={{ fontFamily: "'Cambria','Cochin','Georgia',serif", fontSize: '1.22rem', fontWeight: 700, color: '#fff', letterSpacing: '0.01em', textShadow: '0 0 20px rgba(244,114,182,0.4)' }}>
              Auralynne
            </span>
          </a>

          <ul className="lp-nav-links">
            {(['inicio', 'servicos', 'sobre'] as const).map((id, i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={activeSection === id ? 'lp-active' : ''}
                  onClick={navClick(id)}
                >
                  {['Início', 'Serviços', 'Sobre'][i]}
                </a>
              </li>
            ))}
          </ul>

          <a href="/onboarding" className="lp-btn-primary" style={{ padding: '10px 22px', fontSize: '0.8rem' }}>
            Cadastrar negócio
          </a>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section id="inicio" className="lp-hero">
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,111,145,0.14) 0%, transparent 70%)', top: -80, left: -120, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,132,252,0.10) 0%, transparent 70%)', bottom: 60, left: '30%', pointerEvents: 'none' }} />

        <div className="lp-hero-inner">
          <div className="lp-hero-left">
            <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.28)', borderRadius: 99, padding: '6px 16px', color: '#f472b6', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 24 }}>
              ✦ Seu momento, sua essência
            </span>

            <h1 style={{ fontFamily: "'Cambria','Cochin','Georgia',serif", fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, margin: '0 0 20px', maxWidth: 520 }}>
              Realce sua beleza.<br />
              Sinta sua{' '}
              <span style={{ background: 'linear-gradient(135deg, #f472b6, #e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                melhor versão
              </span>.
            </h1>

            <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: '1rem', lineHeight: 1.75, margin: '0 0 38px', maxWidth: 430 }}>
              Cuidados que valorizam sua beleza natural com técnicas modernas e atendimento exclusivo. Agende pelo celular em segundos.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 52 }}>
              <a href="#servicos" className="lp-btn-primary" onClick={navClick('servicos')}>Agendar agora →</a>
              <a href="#sobre" className="lp-btn-ghost" onClick={navClick('sobre')}>Ver como funciona</a>
            </div>

            <div className="lp-stats-row" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[{ val: '+1.200', label: 'Clientes' }, { val: '4.9 ★', label: 'Avaliação' }, { val: '100%', label: 'Satisfação' }].map(s => (
                <div key={s.val} className="lp-stat-card" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 20px', textAlign: 'center' }}>
                  <div className="lp-stat-val" style={{ color: '#f472b6', fontWeight: 800, fontSize: '1.35rem', fontFamily: "'Cambria',serif", lineHeight: 1 }}>{s.val}</div>
                  <div className="lp-stat-label" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: 5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-hero-right">
            <img src="/img/hero.png" alt="" className="lp-hero-right-img" />
            <div className="lp-hero-right-fade" />
            <div className="lp-hero-right-fade-bottom" />
          </div>
        </div>
      </section>

      {/* ─── Serviços ─── */}
      <section id="servicos" style={{ background: '#0e0309', padding: 'clamp(64px, 8vw, 100px) clamp(20px, 5vw, 72px)' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div className="lp-reveal" style={{ marginBottom: 52 }}>
            <span style={{ color: '#f472b6', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>✦ Nossos serviços</span>
            <h2 style={{ fontFamily: "'Cambria','Cochin','Georgia',serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 700, color: '#fff', margin: '10px 0 0', lineHeight: 1.15 }}>
              Escolha sua experiência
            </h2>
          </div>

          <div className="lp-svc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {SERVICES.map((svc, i) => (
              <a
                key={svc.name}
                href={svc.href}
                className={`lp-svc-card lp-reveal lp-reveal-d${i + 1}`}
                style={{ boxShadow: `0 20px 52px ${svc.glow}, 0 6px 20px rgba(0,0,0,0.28)` }}
              >
                <img src={svc.banner} alt={svc.name} className="lp-svc-card-img" />
                <div className="lp-svc-card-overlay" />
                <div className="lp-svc-card-shine" />
                <div className="lp-svc-card-body">
                  <span style={{ display: 'inline-block', background: svc.accent, borderRadius: 99, padding: '4px 13px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', marginBottom: 10 }}>
                    {svc.tag}
                  </span>
                  <p style={{ fontFamily: "'Cambria','Cochin','Georgia',serif", fontSize: '1.55rem', fontWeight: 700, color: '#fff', margin: '0 0 6px', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                    {svc.name}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.68)', margin: '0 0 18px', fontWeight: 400 }}>{svc.desc}</p>
                  <span className="lp-svc-cta" style={{ background: svc.accent, boxShadow: `0 6px 20px ${svc.glow}` }}>Ver serviços →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Sobre ─── */}
      <section id="sobre" style={{ background: 'linear-gradient(160deg, #130611 0%, #1f0b18 50%, #0e0309 100%)', padding: 'clamp(64px, 8vw, 100px) clamp(20px, 5vw, 72px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,111,145,0.09) 0%, transparent 70%)', top: -80, right: -80, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div className="lp-reveal" style={{ maxWidth: 560, marginBottom: 60 }}>
            <span style={{ color: '#f472b6', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>✦ Sobre a Auralynne</span>
            <h2 style={{ fontFamily: "'Cambria','Cochin','Georgia',serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 700, color: '#fff', margin: '10px 0 14px', lineHeight: 1.15 }}>
              Tecnologia que cuida de quem cuida
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.97rem', lineHeight: 1.75, margin: 0 }}>
              A Auralynne é uma plataforma de agendamento criada para profissionais da beleza. Simples para o cliente agendar, poderosa para você gerenciar.
            </p>
          </div>

          <div className="lp-feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`lp-feat-card lp-reveal lp-reveal-d${i + 1}`}>
                <div style={{ fontSize: '2rem', marginBottom: 16, lineHeight: 1 }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Cambria','Cochin','Georgia',serif", fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{f.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="lp-reveal" style={{ marginTop: 56, display: 'flex', justifyContent: 'center' }}>
            <a href="/onboarding" className="lp-btn-primary" style={{ fontSize: '0.95rem', padding: '16px 36px' }}>
              Cadastrar meu negócio →
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <div style={{ background: '#0e0309', padding: '28px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <BrandFooter />
      </div>
    </>
  );
}
