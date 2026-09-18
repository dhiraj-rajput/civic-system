import React from "react";
import { HeatmapChart } from "@/components/ui/heatmaps";

const DemoHeatmapChart = () => {
  const width = 800;
  const height = 500;

  return (
    <div className="flex w-full min-h-screen justify-center items-center bg-bg p-6">
      <HeatmapChart width={width} height={height} events={true} />
    </div>
  );
};

export { DemoHeatmapChart };
export default DemoHeatmapChart;
