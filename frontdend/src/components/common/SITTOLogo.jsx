/**
 * SITTO brand mark: the iOS-style app icon (public/sitto-icon.svg) plus an
 * optional wordmark.
 *
 * @param {'full' | 'emblem'} variant - 'full' shows icon + wordmark + tagline, 'emblem' the icon (with optional name)
 * @param {'sm' | 'md' | 'lg' | 'xl'} size - Predefined size presets
 * @param {'dark' | 'light'} theme - 'dark' text for light backgrounds, 'light' text for dark backgrounds
 * @param {string} subtitle - Optional badge text (e.g., 'Space Hub', 'Admin Console')
 * @param {boolean} showSubtitle - Whether to show the wordmark next to the emblem
 * @param {string} campusText - Optional campus location text
 * @param {string} className - Additional CSS classes
 * @param {string} imgClassName - Additional CSS classes for the icon
 * @param {string} alt - Accessible label
 */
export const SITTO_ICON_SRC = '/sitto-icon.svg';

export function SITTOIcon({ className = '', alt = '' }) {
  return (
    <img
      src={SITTO_ICON_SRC}
      alt={alt}
      className={`select-none shrink-0 rounded-[22.5%] shadow-[0_4px_14px_rgba(91,61,245,0.35)] ${className}`}
      draggable="false"
    />
  );
}

export default function SITTOLogo({
  variant = 'full',
  size = 'md',
  theme = 'dark',
  subtitle,
  showSubtitle = true,
  campusText,
  className = '',
  imgClassName = '',
  alt = 'SITTO — Smart Campus Seating',
  ...props
}) {
  const isLightTheme = theme === 'light';
  const nameColor = isLightTheme ? 'text-white' : 'text-[#0B0A1F]';
  const mutedColor = isLightTheme ? 'text-white/70' : 'text-[#5E5A7A]';

  if (variant === 'full') {
    const s = {
      sm: { icon: 'w-8 h-8', name: 'text-lg', tag: 'text-[10px]' },
      md: { icon: 'w-11 h-11', name: 'text-2xl', tag: 'text-[11px]' },
      lg: { icon: 'w-14 h-14', name: 'text-[28px]', tag: 'text-xs' },
      xl: { icon: 'w-16 h-16', name: 'text-[34px]', tag: 'text-sm' },
    }[size] || { icon: 'w-11 h-11', name: 'text-2xl', tag: 'text-[11px]' };

    return (
      <div className={`inline-flex items-center gap-3 ${className}`} role="img" aria-label={alt} {...props}>
        <SITTOIcon className={`${s.icon} ${imgClassName}`} />
        <div className="flex flex-col text-left leading-none" aria-hidden="true">
          <span className={`${s.name} font-heading font-bold tracking-[-0.02em] ${nameColor}`}>SITTO</span>
          <span className={`${s.tag} font-medium mt-1 ${mutedColor}`}>Smart Campus Seating</span>
        </div>
      </div>
    );
  }

  const emblemSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size] || 'w-9 h-9';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} {...props}>
      <SITTOIcon className={`${emblemSizes} ${imgClassName}`} alt={alt} />

      {(subtitle || showSubtitle || campusText) && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold font-heading tracking-tight ${nameColor}`}>SITTO</span>
            {subtitle && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isLightTheme
                    ? 'bg-white/15 text-purple-200 border border-white/20'
                    : 'bg-[#F1EDFF] text-[#6850F4]'
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>
          {campusText && (
            <span className={`text-[11px] font-medium mt-1 ${mutedColor}`}>{campusText}</span>
          )}
        </div>
      )}
    </div>
  );
}
