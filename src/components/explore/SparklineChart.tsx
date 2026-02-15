import { LineChart, Line } from "recharts";

type Props = {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
};

export default function SparklineChart({ data, positive, width = 80, height = 28 }: Props) {
  const points = data.map((v, i) => ({ v, i }));
  return (
    <LineChart width={width} height={height} data={points}>
      <Line
        type="monotone"
        dataKey="v"
        stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth={2}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
