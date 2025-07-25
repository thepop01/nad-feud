import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader, ExternalLink, RefreshCw } from 'lucide-react';
import { LinkValidationResult } from '../types';
import { supaclient } from '../services/supabase';

interface UrlValidatorProps {
  url: string;
  className?: string;
  showDetails?: boolean;
  onValidationChange?: (result: LinkValidationResult) => void;
}

const UrlValidator: React.FC<UrlValidatorProps> = ({ 
  url, 
  className = '',
  showDetails = true,
  onValidationChange 
}) => {
  const [validationResult, setValidationResult] = useState<LinkValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateUrl = async () => {
    if (!url || url.trim() === '') {
      setValidationResult(null);
      onValidationChange?.(null as any);
      return;
    }

    setIsValidating(true);
    try {
      const result = await supaclient.validateUrl(url);
      setValidationResult(result);
      onValidationChange?.(result);
    } catch (error) {
      const errorResult = { isValid: false, error: 'Validation failed' };
      setValidationResult(errorResult);
      onValidationChange?.(errorResult);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateUrl();
    }, 1000); // Debounce validation by 1 second

    return () => clearTimeout(timeoutId);
  }, [url]);

  if (!url || url.trim() === '') {
    return null;
  }

  if (isValidating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-slate-700 ${className}`}
      >
        <Loader size={14} className="animate-spin text-blue-400" />
        <span className="text-sm text-slate-400">Validating URL...</span>
      </motion.div>
    );
  }

  if (!validationResult) {
    return null;
  }

  const { isValid, status, error, redirectUrl } = validationResult;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-2 rounded border ${
        isValid 
          ? 'bg-green-900/20 border-green-700/50' 
          : 'bg-red-900/20 border-red-700/50'
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        {isValid ? (
          <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
        ) : (
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${isValid ? 'text-green-300' : 'text-red-300'}`}>
            {isValid ? 'URL is accessible' : 'URL validation failed'}
          </span>
          
          {showDetails && (
            <div className="mt-1 space-y-1">
              {status && (
                <p className="text-xs text-slate-400">
                  Status: {status}
                </p>
              )}
              
              {error && (
                <p className="text-xs text-red-400">
                  {error}
                </p>
              )}
              
              {redirectUrl && (
                <p className="text-xs text-slate-400">
                  Redirects to: <span className="font-mono break-all">{redirectUrl}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={validateUrl}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Revalidate URL"
          >
            <RefreshCw size={12} className="text-slate-400 hover:text-slate-300" />
          </button>
          
          {isValid && (
            <button
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Test URL"
            >
              <ExternalLink size={12} className="text-slate-400 hover:text-slate-300" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UrlValidator;
