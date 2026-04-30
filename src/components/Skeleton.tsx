import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "rectangle" | "circle" | "text";
}

const Skeleton: React.FC<SkeletonProps> = ({ className = "", variant = "rectangle" }) => {
  const baseClasses = "relative overflow-hidden bg-white/5 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";
  
  const variantClasses = {
    rectangle: "rounded-2xl",
    circle: "rounded-full",
    text: "rounded h-4 w-full",
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    />
  );
};

export default Skeleton;
