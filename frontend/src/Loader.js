import React from 'react';
import { Loader as LoaderIcon } from 'lucide-react';

const Loader = ({ className, size = 20 }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <LoaderIcon size={size} className="animate-spin text-blue-500" />
    </div>
  );
};

export default Loader;