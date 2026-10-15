import { createElement } from 'react';
import { Brain, Compass, Flame, Globe, Heart, MessageCircleQuestion, Smile, Star, type LucideIcon } from 'lucide-react';

export interface Topic {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

const icons: Record<string, LucideIcon> = { star: Star, heart: Heart, compass: Compass, brain: Brain, smile: Smile, globe: Globe, flame: Flame };

// A question category's icon, the "suit" in the corner of the question card. Returns the element,
// since a component picked during render trips react-hooks/static-components.
export const topicIcon = (icon: string | null | undefined, className: string) =>
  createElement((icon && icons[icon]) || MessageCircleQuestion, { className, 'aria-hidden': true });
// Category names may be stored lowercase ("deep"); show them in sentence case
export const topicName = (t: Topic) => t.name.charAt(0).toUpperCase() + t.name.slice(1);
