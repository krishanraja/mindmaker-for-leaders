/**
 * Mindmaker Favicon Mark
 * 
 * Displays the favicon icon (mindmaker-favicon.png) in the top-left corner
 * when the main logo is not present on a page.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { transitions } from '@/lib/motion';
import { CtrlLogo } from '@/components/landing/CtrlLogo';

interface FaviconMarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-auto',
  md: 'h-5 w-auto',
  lg: 'h-6 w-auto',
};

export const FaviconMark: React.FC<FaviconMarkProps> = ({ 
  className = '',
  size = 'md',
}) => {
  return (
    <motion.div
      className={`fixed top-6 left-6 z-50 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={transitions.default}
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={transitions.fast}
      >
        <CtrlLogo className={sizeClasses[size]} />
      </motion.div>
    </motion.div>
  );
};

export default FaviconMark;
