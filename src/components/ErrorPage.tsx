interface ErrorPageProps {
  message: string
  onBack: () => void
}

export default function ErrorPage({ message, onBack }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-bg">
      <svg width="250" height="165" viewBox="-20 0 250 165" fill="none" xmlns="http://www.w3.org/2000/svg" className="fade-in">
        <ellipse cx="108" cy="152" rx="72" ry="8" fill="rgba(79,142,247,0.06)"/>
        <rect x="60" y="88" width="98" height="58" rx="12" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.30)" strokeWidth="1.8"/>
        <rect x="76" y="102" width="36" height="26" rx="5" fill="rgba(79,142,247,0.06)" stroke="rgba(79,142,247,0.16)" strokeWidth="1.2"/>
        <circle cx="84"  cy="110" r="3" fill="rgba(79,142,247,0.28)"/>
        <circle cx="94"  cy="110" r="3" fill="rgba(96,165,250,0.22)"/>
        <circle cx="104" cy="110" r="3" fill="rgba(251,191,36,0.24)"/>
        <rect x="78" y="118" width="32" height="5" rx="2.5" fill="rgba(79,142,247,0.13)"/>
        <rect x="50" y="104" width="14" height="18" rx="3" fill="rgba(79,142,247,0.12)" stroke="rgba(79,142,247,0.20)" strokeWidth="1.2"/>
        <g transform="rotate(10, 22, 116)">
          <rect x="-12" y="82" width="64" height="58" rx="14" fill="rgba(79,142,247,0.11)" stroke="rgba(79,142,247,0.34)" strokeWidth="1.8"/>
          <line x1="0"  y1="96" x2="14" y2="110" stroke="rgba(248,113,113,0.62)" strokeWidth="2.4" strokeLinecap="round"/>
          <line x1="14" y1="96" x2="0"  y2="110" stroke="rgba(248,113,113,0.62)" strokeWidth="2.4" strokeLinecap="round"/>
          <line x1="22" y1="96" x2="36" y2="110" stroke="rgba(248,113,113,0.62)" strokeWidth="2.4" strokeLinecap="round"/>
          <line x1="36" y1="96" x2="22" y2="110" stroke="rgba(248,113,113,0.62)" strokeWidth="2.4" strokeLinecap="round"/>
          <path d="M 2 126 Q 18 120 34 126" stroke="rgba(79,142,247,0.48)" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M 18 82 C 16 66, 8 56, 2 48" stroke="rgba(79,142,247,0.36)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          <circle cx="2" cy="46" r="5.5" fill="rgba(79,142,247,0.16)" stroke="rgba(79,142,247,0.38)" strokeWidth="1.5"/>
        </g>
        <rect x="88" y="32" width="15" height="58" rx="7.5" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.25)" strokeWidth="1.7"/>
        <rect x="83" y="19" width="25" height="16" rx="7"   fill="rgba(79,142,247,0.10)" stroke="rgba(79,142,247,0.26)" strokeWidth="1.6"/>
        <rect x="112" y="26" width="15" height="62" rx="7.5" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.25)" strokeWidth="1.7"/>
        <rect x="107" y="12" width="25" height="16" rx="7"   fill="rgba(79,142,247,0.10)" stroke="rgba(79,142,247,0.26)" strokeWidth="1.6"/>
        <rect x="155" y="110" width="44" height="13" rx="6.5" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.22)" strokeWidth="1.6"/>
        <circle cx="201" cy="116" r="9" fill="rgba(79,142,247,0.09)" stroke="rgba(79,142,247,0.24)" strokeWidth="1.6"/>
        <text x="152" y="88" fontSize="13" fontWeight="700" fill="rgba(79,142,247,0.52)" fontFamily="monospace">z</text>
        <text x="168" y="67" fontSize="17" fontWeight="700" fill="rgba(79,142,247,0.34)" fontFamily="monospace">z</text>
        <text x="188" y="44" fontSize="21" fontWeight="700" fill="rgba(79,142,247,0.18)" fontFamily="monospace">z</text>
      </svg>

      <div className="bg-red/8 border border-red/20 rounded-2xl py-6 px-8 max-w-[440px] fade-in-delay">
        <div className="text-base font-semibold text-red mb-2">오류가 발생했습니다</div>
        <div className="text-[13px] text-fg-secondary leading-relaxed whitespace-pre-line">{message}</div>
      </div>

      <button
        className="bg-transparent border border-border-light rounded-xl px-5 py-2.5 text-[13px] font-medium text-fg-secondary cursor-pointer hover:border-accent hover:text-accent transition-all"
        onClick={onBack}
      >
        ← 뒤로
      </button>
    </div>
  )
}
