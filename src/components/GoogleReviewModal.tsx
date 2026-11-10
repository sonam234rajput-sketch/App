import React, { useState } from 'react';
import { Star, X, Check, MapPin, ExternalLink } from 'lucide-react';

interface GoogleReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleReviewModal: React.FC<GoogleReviewModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-5 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Rate & Review AarohAI</h3>
          <p className="text-xs text-slate-500">
            Your feedback helps thousands of students across India prepare better!
          </p>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-200">
            <Check className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Thank You for Your Review!</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Your star rating and feedback have been recorded.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Star selector */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share how AarohAI helped you in your study or exam preparation..."
              className="w-full h-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white"
            />

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all"
            >
              Submit Website Review ⭐
            </button>

            {/* Real Google Maps link button option */}
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700"
            >
              <MapPin className="w-4 h-4 text-red-500" />
              <span>Review on Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

          </form>
        )}

      </div>
    </div>
  );
};
