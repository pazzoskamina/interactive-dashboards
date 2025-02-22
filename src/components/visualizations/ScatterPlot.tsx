import React from "react";
import { useStore } from "effector-react";
import Plot from "react-plotly.js";
import { ChartProps } from "../../interfaces";
import { $visualizationData } from "../../Store";
import { $visualizationMetadata } from "../../Store";

interface ScatterPlotProps extends ChartProps {
    category?: string;
    series?: string;
}

const ScatterPlot = ({ visualization }: ScatterPlotProps) => {
    const visualizationData = useStore($visualizationData)?.[visualization.id];
    const metadata = useStore($visualizationMetadata)?.[visualization.id];
    console.log("visdata", visualizationData);
    console.log("metadata", metadata);
    const traces =
        visualizationData?.map((data: any, i: number) => {
            const monthData = metadata?.[data.pe];
            return {
                x: [monthData?.name],
                y: [parseFloat(data.value)],
                mode: "markers",
                type: "scatter",
                marker: {
                    size: visualization.properties.markerSize,
                },
            };
        }) || [];
    console.log("visualisation:", visualization);
    console.log("traces:", traces);
    return (
        <Plot
            // TODO Fix this as any
            data={traces as any}
            layout={{
                title: visualization.showTitle ? "Scatter Plot" : "",
                xaxis: {
                    title: "Month",
                },
                yaxis: {
                    title: "Doses Given",
                },
                showlegend: false,
            }}
            style={{ width: "100%", height: "100%" }}
            config={{ displayModeBar: false, responsive: true }}
        />
    );
};

export default ScatterPlot;
