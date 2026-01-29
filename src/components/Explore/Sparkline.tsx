// src/components/Explore/Sparkline.tsx
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data?: number[];
  width?: number;
  height?: number;
  className?: string;
  positive?: boolean;
}

// Generate mock sparkline data based on price change direction
function generateSparklineData(positive: boolean): number[] {
  const points = 20;
  const data: number[] = [];
  let value = 50;
  
  for (let i = 0; i < points; i++) {
    // Trend towards the end based on positive/negative
    const trend = positive ? 0.3 : -0.3;
    const noise = (Math.random() - 0.5) * 10;
    value = Math.max(10, Math.min(90, value + trend + noise));
    data.push(value);
  }
  
  // Ensure the end reflects the trend
  if (positive) {
    data[points - 1] = Math.max(data[points - 1], data[0] + 10);
  } else {
    data[points - 1] = Math.min(data[points - 1], data[0] - 10);
  }
  
  return data;
}

export default function Sparkline({ 
  data, 
  width = 60, 
  height = 24, 
  className,
  positive = true 
}: SparklineProps) {
  const sparkData = useMemo(() => {
    if (data && data.length > 0) return data;
    return generateSparklineData(positive);
  }, [data, positive]);

  const path = useMemo(() => {
    if (sparkData.length === 0) return "";
    
    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    
    const points = sparkData.map((value, index) => {
      const x = (index / (sparkData.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    });
    
    return `M ${points.join(" L ")}`;
  }, [sparkData, width, height]);

  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn("shrink-0", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop 
            offset="0%" 
            stopColor={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"} 
            stopOpacity="0.3" 
          />
          <stop 
            offset="100%" 
            stopColor={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"} 
            stopOpacity="1" 
          />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
