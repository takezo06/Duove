import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface PolaroidProps {
  src: string;
  alt: string;
  // written in the strip under the photo
  caption?: string;
  // the small one tucked into a bouquet: the strip stays blank and a failed photo shows only its icon
  compact?: boolean;
  className?: string;
}

// A photo in a warm-white instant-film frame, with the thick strip at the bottom. Square corners, like the real thing.
// The photo's link can stop working (it's signed for an hour, and saved letters keep it offline), so a failed
// photo says so instead of showing a broken image.
export function Polaroid({ src, alt, caption, compact, className = '' }: PolaroidProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const broken = failed === src;

  return (
    // The outer box takes the size, so the frame's percentages (6% on three sides, 22% at the bottom, which makes
    // the strip 19% of its height) are of the polaroid's own width wherever it's placed, not of its parent's
    <div className={className}>
      <div className="relative bg-neutral-100 px-[6%] pt-[6%] pb-[22%]">
        <div className="aspect-square overflow-hidden bg-neutral-300">
          {broken ? (
            <div role="img" aria-label={alt} className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center text-neutral-600">
              <ImageOff className="w-4 h-4" aria-hidden />
              {!compact && <span className="text-sm">The photo didn't load. Reload the page to try again.</span>}
            </div>
          ) : (
            <img src={src} alt={alt} decoding="async" draggable={false} onError={() => setFailed(src)} className="w-full h-full object-cover" />
          )}
        </div>
        {caption && !compact && (
          <p className="absolute inset-x-0 bottom-0 h-[19%] flex items-center justify-center text-sm text-neutral-600">{caption}</p>
        )}
      </div>
    </div>
  );
}
