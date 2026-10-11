import React from 'react';
import fullLogo from '../../assets/sitto-logo.png';
import emblemLogo from '../../assets/sitto-emblem.png';

/**
 * Reusable SITTOLogo component supporting both full banner branding
 * and compact chair emblem branding across light and dark themes.
 *
 * @param {'full' | 'emblem'} variant - 'full' for the complete brand banner, 'emblem' for the compact chair icon
 * @param {'sm' | 'md' | 'lg' | 'xl'} size - Predefined size presets
 * @param {'dark' | 'light'} theme - Color theme for companion text ('dark' text for light backgrounds, 'light' text for dark backgrounds)
 * @param {string} subtitle - Optional badge text (e.g., 'Space Hub', 'Admin Console')
 * @param {boolean} showSubtitle - Whether to display the subtitle
 * @param {string} campusText - Optional campus location text
 * @param {string} className - Additional CSS classes
 * @param {string} imgClassName - Additional CSS classes for the <img> element
 * @param {string} alt - Accessible image alt text
 */
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
  if (variant === 'full') {
    const sizeClasses = {
      sm: 'h-8 max-w-[200px]',
      md: 'h-12 max-w-[280px]',
      lg: 'h-16 max-w-[340px]',
      xl: 'h-20 max-w-[420px]',
    }[size] || 'h-12';

    return (
      <div className={`inline-flex items-center justify-center ${className}`} {...props}>
        <img
          src={fullLogo}
          alt={alt}
          className={`w-auto object-contain select-none drop-shadow-xs ${sizeClasses} ${imgClassName}`}
          loading="eager"
        />
      </div>
    );
  }

  // Emblem variant (compact chair icon)
  const emblemSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size] || 'w-9 h-9';

  const isLightTheme = theme === 'light'; // Light text on dark bg

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} {...props}>
      <div className={`relative shrink-0 flex items-center justify-center ${emblemSizes}`}>
        <img
          src={emblemLogo}
          alt={alt}
          className={`w-full h-full object-contain select-none transition-transform ${imgClassName}`}
          loading="eager"
        />
      </div>

      {(subtitle || showSubtitle || campusText) && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-2">
            <span
              className={`text-base font-bold font-heading tracking-tight ${
                isLightTheme ? 'text-white' : 'text-[#0F0D26]'
              }`}
            >
              SITTO
            </span>
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
            <span
              className={`text-[11px] font-medium mt-1 ${
                isLightTheme ? 'text-purple-200/80' : 'text-gray-500'
              }`}
            >
              {campusText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
