import React from "react";

interface DecorativeShapeProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: "sm" | "md" | "lg";
  opacity?: number;
  zIndex?: number;
  rotation?: number; // Rotation angle in degrees
  className?: string;
}

const DecorativeShape: React.FC<DecorativeShapeProps> = ({
  position = "top-right",
  size = "md",
  opacity = 0.1,
  zIndex = 1,
  rotation = 0,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-24 h-24 md:w-32 md:h-32",
    md: "w-32 h-32 md:w-48 md:h-48",
    lg: "w-48 h-48 md:w-64 md:h-64",
  };

  const positionClasses = {
    "top-left": "top-4 left-4 md:top-8 md:left-8",
    "top-right": "top-4 right-4 md:top-8 md:right-8",
    "bottom-left": "bottom-4 left-4 md:bottom-8 md:left-8",
    "bottom-right": "bottom-4 right-4 md:bottom-8 md:right-8",
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} ${sizeClasses[size]} pointer-events-none ${className}`}
      style={{
        opacity,
        zIndex,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <img
        src="/logos/shape.svg"
        alt="Decorative shape"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default DecorativeShape;
