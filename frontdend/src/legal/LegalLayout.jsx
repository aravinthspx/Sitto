import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL } from './siteInfo';
import { LegalLinks } from './LegalLinks';

export function LegalLayout({ title, children }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#3B3568] bg-white/50 border border-white/70 hover:bg-white/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/sitto-emblem.png" alt="" className="w-8 h-8 object-contain" />
            <span className="font-heading font-bold text-[#0F0D26]">{LEGAL.productName}</span>
          </Link>
        </div>

        <article className="glass-panel rounded-3xl p-6 sm:p-10 legal-prose">
          <h1>{title}</h1>
          <p className="legal-meta">
            Effective {LEGAL.effectiveDate} · Version {LEGAL.policyVersion}
          </p>
          {children}
        </article>

        <LegalLinks className="mt-6 justify-center" />
      </div>
    </div>
  );
}
