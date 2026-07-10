import { BentoGrid } from '../components/BentoGrid';
import { usePageTitle } from '../hooks/usePageTitle';

export function Dashboard() {
  usePageTitle('Home');
  return <BentoGrid />;
}
