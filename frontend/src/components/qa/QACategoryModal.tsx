import { XCircle, Star, Heart, Compass, Brain, Smile, Globe, Flame, Sparkles } from 'lucide-react';

const iconMap: Record<string, any> = {
  star: Star,
  heart: Heart,
  compass: Compass,
  brain: Brain,
  smile: Smile,
  globe: Globe,
  flame: Flame,
};

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface QACategoryModalProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  updating: boolean;
}

export function QACategoryModal({
  categories,
  selectedCategoryId,
  onSelect,
  onClose,
  updating,
}: QACategoryModalProps) {
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Sparkles;
    return <IconComponent className="w-4 h-4 text-rose-400" />;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Next Question Category</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-neutral-400 mb-4">
          Select a category for tomorrow's question. Leave empty for random.
        </p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {/* Random option */}
          <button
            onClick={() => onSelect(null)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition ${
              selectedCategoryId === null
                ? 'bg-rose-500/20 border-rose-400/30 text-rose-400'
                : 'bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:bg-neutral-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span className="font-medium">Random</span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">No preference</p>
          </button>

          {/* Category options */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                selectedCategoryId === cat.id
                  ? 'bg-rose-500/20 border-rose-400/30 text-rose-400'
                  : 'bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:bg-neutral-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {getIcon(cat.icon)}
                <span className="font-medium capitalize">{cat.name}</span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">{cat.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
