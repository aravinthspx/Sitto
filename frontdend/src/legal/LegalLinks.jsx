import { Link } from 'react-router-dom';
import { LEGAL } from './siteInfo';

export function LegalLinks({ className = '' }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#45423A] ${className}`}>
      <Link to="/privacy" className="hover:text-[#2E4BFF] hover:underline">Privacy Policy</Link>
      <Link to="/cookies" className="hover:text-[#2E4BFF] hover:underline">Cookie Policy</Link>
      <span>© {new Date().getFullYear()} {LEGAL.productName}</span>
    </nav>
  );
}
