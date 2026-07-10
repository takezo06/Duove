import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export function NotFound() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-12 shadow-xl">
        <div className="w-20 h-20 bg-rose-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-400/20">
          <FileQuestion className="w-10 h-10 text-rose-400" />
        </div>
        <h1 className="text-3xl font-semibold text-white mb-3">Page Not Found</h1>
        <p className="text-neutral-400 max-w-md mx-auto mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition shadow-lg shadow-rose-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
