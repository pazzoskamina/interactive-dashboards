import { colorSets } from "@dhis2/analytics";
import { center } from "@turf/turf";
import axios from "axios";
import {
    eachDayOfInterval,
    eachMonthOfInterval,
    eachQuarterOfInterval,
    eachWeekOfInterval,
    eachYearOfInterval,
    format,
} from "date-fns";
import dayjs, { ManipulateType } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { useStore } from "effector-react";
import { fromPairs, groupBy, uniq } from "lodash";
import { evaluate } from "mathjs";
import { findColor } from "../components/processors";
import {
    Authentication,
    Option,
    Period,
    Threshold,
    VisualizationItems,
} from "../interfaces";
import { $visualizationQuery } from "../Store";

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

export function encodeToBinary(str: string): string {
    return btoa(
        encodeURIComponent(str).replace(
            /%([0-9A-F]{2})/g,
            function (match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            }
        )
    );
}
export function decodeFromBinary(str: string): string {
    return decodeURIComponent(
        Array.prototype.map
            .call(atob(str), function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
    );
}

const getValue = (value: number) => {
    if (value >= 75) return "a";
    if (value >= 50) return "t";

    return "u";
};

export const globalIds: Option[] = [
    { label: "Period", value: "m5D13FqKZwN", id: "pe" },
    { label: "Program Indicator", value: "Eep3rko7uh6", id: "pi" },
    { label: "Indicator", value: "JRDOr08JWSW", id: "i" },
    { label: "Organisation Group", value: "of2WvtwqbHR", id: "oug" },
    { label: "Organisation Level", value: "GQhi6pRnTKF", id: "oul" },
    { label: "Organisation", value: "mclvD0Z9mfT", id: "ou" },
    { label: "Data Element", value: "h9oh0VhweQM", id: "de" },
    { label: "Attribute Option Combo", value: "WSiMOMi4QWh", id: "aoc" },
    { label: "Category Option Combo", value: "p26VJMtSUSv", id: "coc" },
    {
        label: "Target Attribute Option Combo",
        value: "OOhWJ4gfZy1",
        id: "taoc",
    },
    { label: "Organisation Sublevel", value: "ww1uoD3DsYg", id: "osl" },
    {
        label: "Previous Attribute Option Combo",
        value: "IK4jwzIuqNO",
        id: "paoc",
    },
    {
        label: "Data Element Group",
        value: "JsPfHe1QkJe",
        id: "deg",
    },
    {
        label: "Data Element Group Set",
        value: "HdiJ61vwqTX",
        id: "degs",
    },
];

export const convertTime = (value: string) => {
    if (value === "off") {
        return -1;
    }

    if (value.endsWith("s")) {
        return;
    }
};

export const getSearchParams = (query?: string) => {
    if (query) {
        const all = query.match(/\${\w+}/g);
        if (all !== null) {
            return uniq(all.map((s) => s.replace("${", "").replace("}", "")));
        }
    }
    return [];
};
export const getPeriodsBetweenDates = (
    start?: Date,
    end?: Date,
    periodType?: string
) => {
    if (start && end && periodType) {
        const all: { [key: string]: string[] } = {
            date: eachDayOfInterval({ start, end }).map((d: Date) =>
                format(d, "yyyyMMdd")
            ),
            week: eachWeekOfInterval({ start, end }).map((d: Date) =>
                format(d, "yyyy'W'w")
            ),
            month: eachMonthOfInterval({ start, end }).map((d: Date) =>
                format(d, "yyyyMM")
            ),
            quarter: eachQuarterOfInterval({ start, end }).map((d: Date) =>
                format(d, "yyyyQQQ")
            ),
            year: eachYearOfInterval({ start, end }).map((d: Date) =>
                format(d, "yyyy")
            ),
        };
        return all[periodType] || all["month"];
    }
    return [];
};

export const nest: any = (items: any[], id = null, link = "pId") => {
    return items
        .filter((item) => item[link] === id)
        .map((item) => {
            const children = nest(items, item.key);
            if (children.length > 0) {
                return { ...item, children };
            }
            return { ...item };
        });
};

const iterate = (obj: { [key: string]: any }) => {
    Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === "object") {
            iterate(obj[key]);
        }
    });
};

export const getNestedKeys = (data: { [key: string]: any }, keys: string[]) => {
    if (!(data instanceof Array) && typeof data == "object") {
        Object.keys(data).forEach((key) => {
            keys.push(key);
            const value = data[key];
            if (typeof value === "object" && !(value instanceof Array)) {
                getNestedKeys(value, keys);
            }
        });
    }
    return keys;
};

export const oneBucketAggregation = (data: { [key: string]: any }) => {
    data.buckets;
};
export const oneMetricAggregation = (data: { [key: string]: any }) => {
    return data;
};

export const bucketMetricAggregation = (data: { [key: string]: any }) => {
    return data.buckets.flatMap(
        ({ key, doc_count, pe, dx, ou, total }: any) => {
            let obj = { key };
            if (total) {
                return { ...obj, value: total.value };
            }

            if (pe && pe.buckets) {
                return pe.buckets.flatMap(
                    ({ key, dx, ou, doc_count, total }: any) => {
                        if (total) {
                            return { ...obj, pe: key, value: total.value };
                        }

                        if (dx && dx.buckets) {
                            return dx.buckets.flatMap(
                                ({ key, doc_count, total }: any) => {
                                    if (total) {
                                        return {
                                            ...obj,
                                            dx: key,
                                            value: total.value,
                                        };
                                    }

                                    return {
                                        ...obj,
                                        dx: key,
                                        value: doc_count,
                                    };
                                }
                            );
                        }

                        if (ou && ou.buckets) {
                            return ou.buckets.flatMap(
                                ({ key, doc_count, total }: any) => {
                                    if (total) {
                                        return {
                                            ...obj,
                                            ou: key,
                                            value: total.value,
                                        };
                                    }

                                    return {
                                        ...obj,
                                        ou: key,
                                        value: doc_count,
                                    };
                                }
                            );
                        }
                        return { ...obj, pe: key, value: doc_count };
                    }
                );
            }

            if (dx && dx.buckets) {
                return dx.buckets.flatMap(
                    ({ key, pe, ou, doc_count, total }: any) => {
                        if (total) {
                            return { ...obj, dx: key, value: total.value };
                        }

                        if (pe && pe.buckets) {
                            return pe.buckets.flatMap(
                                ({ key, pe, ou, doc_count, total }: any) => {
                                    if (total) {
                                        return {
                                            ...obj,
                                            pe: key,
                                            value: total.value,
                                        };
                                    }

                                    if (pe && pe.buckets) {
                                        return pe.buckets.flatMap(
                                            ({
                                                key,
                                                doc_count,
                                                total,
                                            }: any) => {
                                                if (total) {
                                                    return {
                                                        ...obj,
                                                        pe: key,
                                                        value: total.value,
                                                    };
                                                }
                                                return {
                                                    ...obj,
                                                    pe: key,
                                                    value: doc_count,
                                                };
                                            }
                                        );
                                    }

                                    if (ou && ou.buckets) {
                                        return ou.buckets.flatMap(
                                            ({
                                                key,
                                                doc_count,
                                                total,
                                            }: any) => {
                                                if (total) {
                                                    return {
                                                        ...obj,
                                                        ou: key,
                                                        value: total.value,
                                                    };
                                                }
                                                return {
                                                    ...obj,
                                                    ou: key,
                                                    value: doc_count,
                                                };
                                            }
                                        );
                                    }
                                    return {
                                        ...obj,
                                        pe: key,
                                        value: doc_count,
                                    };
                                }
                            );
                        }

                        if (ou && ou.buckets) {
                            return ou.buckets.flatMap(
                                ({
                                    key,
                                    pe,
                                    dx,
                                    ou,
                                    doc_count,
                                    total,
                                }: any) => {
                                    if (total) {
                                        return {
                                            ...obj,
                                            ou: key,
                                            value: total.value,
                                        };
                                    }

                                    if (pe && pe.buckets) {
                                        return pe.buckets.flatMap(
                                            ({
                                                key,
                                                ou,
                                                doc_count,
                                                total,
                                            }: any) => {
                                                if (total) {
                                                    return {
                                                        ...obj,
                                                        pe: key,
                                                        value: total.value,
                                                    };
                                                }

                                                return {
                                                    ...obj,
                                                    pe: key,
                                                    value: doc_count,
                                                };
                                            }
                                        );
                                    }

                                    if (dx && dx.buckets) {
                                        return dx.buckets.flatMap(
                                            ({
                                                key,
                                                doc_count,
                                                total,
                                            }: any) => {
                                                if (total) {
                                                    return {
                                                        ...obj,
                                                        dx: key,
                                                        value: total.value,
                                                    };
                                                }

                                                return {
                                                    ...obj,
                                                    dx: key,
                                                    value: doc_count,
                                                };
                                            }
                                        );
                                    }

                                    if (ou && ou.buckets) {
                                        return ou.buckets.flatMap(
                                            ({
                                                key,
                                                doc_count,
                                                total,
                                            }: any) => {
                                                if (total) {
                                                    return {
                                                        ...obj,
                                                        ou: key,
                                                        value: total.value,
                                                    };
                                                }

                                                return {
                                                    ...obj,
                                                    ou: key,
                                                    value: doc_count,
                                                };
                                            }
                                        );
                                    }
                                    return {
                                        ...obj,
                                        ou: key,
                                        value: doc_count,
                                    };
                                }
                            );
                        }
                        return { ...obj, dx: key, value: doc_count };
                    }
                );
            }

            if (ou && ou.buckets) {
                return ou.buckets.flatMap(
                    ({ key, pe, dx, ou, doc_count, total }: any) => {
                        if (total) {
                            return { ...obj, ou: key, value: total.value };
                        }
                        return { ...obj, ou: key, value: doc_count };
                    }
                );
            }
            return { ...obj, value: doc_count };
        }
    );
};

export function traverse(node: any, query: { [key: string]: any }) {
    if (
        node.numerator &&
        node.denominator &&
        !node.numerator.buckets &&
        !node.denominator.buckets
    ) {
        const numerator = node.numerator.value;
        const denominator = node.denominator.value;
        if (denominator !== 0) {
            return [{ value: (numerator * 100) / denominator }];
        }
    } else if (node.numerator && !node.numerator.buckets) {
        return [node.numerator];
    } else if (
        node.numerator &&
        node.denominator &&
        node.numerator.buckets &&
        node.denominator.buckets
    ) {
        const numerators = node.numerator.buckets.map((bucket: any) => {});
        const denominators = node.denominator.buckets.map((bucket: any) => {});
    } else if (node.numerator && node.numerator.buckets) {
        return node.numerator.buckets.map((bucket: any) => {
            // const;
        });
    }
    return [{ value: 0 }];
}

export const updateValAtKey: any = (
    obj: { [key: string]: any },
    path: string[],
    cb: any
) => {
    const checkValidPath: any = (
        obj: { [key: string]: any },
        path: string[]
    ) => {
        if (path.length > 1) {
            if (typeof obj[path[0]] !== "object") {
                return false;
            } else {
                return checkValidPath(obj[path[0]], path.slice(1, path.length));
            }
        } else {
            if (obj[path[0]]) {
                return true;
            } else {
                return false;
            }
        }
    };
    if (checkValidPath(obj, path)) {
        const key = path[0];
        if (path.length > 1) {
            return Object.assign({}, obj, {
                [key]: updateValAtKey(
                    Object.assign({}, obj[key]),
                    path.slice(1, path.length),
                    cb
                ),
            });
        } else {
            return Object.assign({}, obj, { [key]: cb(obj[key]) });
        }
    }
};

export const colors: Option[] = [
    {
        label: "Color2",
        value: [
            "green",
            "#38A169",
            "yellow",
            "orange",
            "red",
            "black",
            "#8c564b",
            "#7f7f7f",
            "#bcbd22",
        ].join(","),
    },
    {
        label: "Color1",
        value: [
            "#e377c2",
            "#1f77b4",
            "#ff7f0e",
            "#2ca02c",
            "#d62728",
            "#9467bd",
            "#8c564b",
            "#7f7f7f",
            "#bcbd22",
        ].join(","),
    },
    {
        label: "Rich Black FOGRA 29",
        value: "#ca6702,#001219,#005f73,#0a9396,#94d2bd,#e9d8a6,#ee9b00,#bb3e03,#ae2012,#9b2226",
    },
    {
        label: "Melon",
        value: "#ece4db,#fec5bb,#fcd5ce,#fae1dd,#f8edeb,#e8e8e4,#d8e2dc,#ffe5d9,#ffd7ba,#fec89a",
    },
    {
        label: "Xiketic",
        value: "#dc2f02,#03071e,#370617,#6a040f,#9d0208,#d00000,#e85d04,#f48c06,#faa307,#ffba08",
    },
    {
        label: "Pink",
        value: "#480ca8,#f72585,#b5179e,#7209b7,#560bad,#3a0ca3,#3f37c9,#4361ee,#4895ef,#4cc9f0",
    },
    {
        label: "Purple",
        value: "#5390d9,#7400b8,#6930c3,#5e60ce,#4ea8de,#48bfe3,#56cfe1,#64dfdf,#72efdd,#80ffdb",
    },
    {
        label: "Desert Sand",
        value: "#edc4b3,#e6b8a2,#deab90,#d69f7e,#cd9777,#c38e70,#b07d62,#9d6b53,#8a5a44,#774936",
    },
    {
        label: "Red Salsa",
        value: "#f94144,#f3722c,#f8961e,#f9844a,#f9c74f,#90be6d,#43aa8b,#4d908e,#577590,#277da1",
    },
    {
        label: "Yellow Green Crayola",
        value: "#d9ed92,#b5e48c,#99d98c,#76c893,#52b69a,#34a0a4,#168aad,#1a759f,#1e6091,#184e77",
    },
    {
        label: "Cotton Candy",
        value: "#ffcbf2,#f3c4fb,#ecbcfd,#e5b3fe,#e2afff,#deaaff,#d8bbff,#d0d1ff,#c8e7ff,#c0fdff",
    },
    {
        label: "Spanish Viridian",
        value: "#007f5f,#2b9348,#55a630,#80b918,#aacc00,#bfd200,#d4d700,#dddf00,#eeef20,#ffff3f",
    },
    {
        label: "Ruby Red",
        value: "#0b090a,#161a1d,#660708,#a4161a,#ba181b,#e5383b,#b1a7a6,#d3d3d3,#f5f3f4,#ffffff",
    },
    {
        label: "Midnight Green",
        value: "#006466,#065a60,#0b525b,#144552,#1b3a4b,#212f45,#272640,#312244,#3e1f47,#4d194d",
    },
    {
        label: "Xiketic2",
        value: "#dc2f02,#ffba08,#2ca02c,#03071e,#370617,#6a040f,#9d0208,#d00000,#e85d04,#f48c06,#faa307",
    },
];

export const exclusions: any[] = [
    "lasso2d",
    "select2d",
    "sendDataToCloud",
    "zoom2d",
    "pan2d",
    "zoomIn2d",
    "zoomOut2d",
    "autoScale2d",
    "resetScale2d",
    "hoverClosestCartesian",
    "hoverCompareCartesian",
    "zoom3d",
    "pan3d",
    "orbitRotation",
    "tableRotation",
    "resetCameraDefault3d",
    "resetCameraLastSave3d",
    "hoverClosest3d",
    "zoomInGeo",
    "zoomOutGeo",
    "resetGeo",
    "hoverClosestGeo",
    "hoverClosestGl2d",
    "hoverClosestPie",
    "toggleHover",
    "resetViews",
    "toggleSpikelines",
];

export const chartTypes: Option[] = [
    { value: "single", label: "Single Value" },
    { value: "map", label: "Map" },
    { value: "bar", label: "Bar" },
    { value: "pie", label: "Pie" },
    { value: "line", label: "Line" },
    { value: "sunburst", label: "Sunburst" },
    { value: "gauge", label: "Gauge" },
    { value: "histogram", label: "Histogram" },
    { value: "area", label: "Area Graph" },
    { value: "radar", label: "Radar Graph" },
    { value: "bubblemaps", label: "Bubbble Maps" },
    { value: "funnelplot", label: "Funnel Graph" },
    { value: "multiplecharts", label: "Line and Graph" },
    { value: "treemaps", label: "Tree Map" },
    { value: "tables", label: "Table" },
    { value: "boxplot", label: "Box Plot" },
    { value: "scatterplot", label: "Scatter Plot" },
    { value: "stackedarea", label: "Stacked Area" },
    { value: "dashboardList", label: "Dashboard List" },
    { value: "dashboardTree", label: "Dashboard Tree" },
    { value: "categoryList", label: "Dashboard Categories" },
    { value: "filters", label: "Dashboard Filter" },
    { value: "imageVisualization", label: "Image" },
    { value: "dashboardTitle", label: "Dashboard Title" },
    { value: "optionSet", label: "Option Set" },
    { value: "text", label: "Text" },
    { value: "clock", label: "Clock" },
    { value: "heatmap", label: "Heat Map" },
    { value: "dhis2", label: "DHIS2 Visualization" },
    { value: "divider", label: "Divider" },
];

export const donNotRequireQuery = [
    "dhis2",
    "clock",
    "text",
    "filters",
    "imageVisualization",
    "dashboardTree",
    "dashboardList",
    "dashboardTitle",
    "divider",
    "categoryList",
];

export const createOptions = (options: string[]): Option[] => {
    return options.map((option: string) => {
        return { label: option, value: option };
    });
};

export const divide = (expression: string, data: { [key: string]: any[] }) => {
    const indicators = expression.split("/");
    if (indicators && indicators.length === 2) {
        const [ind1, ind2] = indicators;
        const data1 = data[ind1];
        const data2 = data[ind2];
        if (data1 && data1.length === 1 && data2 && data2.length === 1) {
            return [{ total: data1[0].total / data2[0].total }];
        }
    }
    return [{ total: 0 }];
};

export const allMetadata: { [key: string]: string } = {
    CnIU4JH161i: "12 - 24 months",
    dZN788jq32i: "15 - 60 Years",
    euNzABJD0rl: "18- 24 months",
    rSn71nAWEyZ: "2 - <5 years",
    PkScN8lPCJu: "6 - 14 Years",
    PmQTItIJKn0: "9 Months - 5 Years",
    Hi8VxB592t8: "9-11 months",
    xBpTFgYQbPV: "9-17 months",
    lFFAVORlK5r: "Broken",
    jAbqv8bnCqT: "Contamination",
    daugmmgzAkU: "Day 1",
    C1IRVkhB3MW: "Day 2",
    L48zD78K9AI: "Day 3",
    zPaWaUOubgL: "Day 4",
    vmPAdWGX6qy: "Day 4 (Mop up day)",
    J9wUCeShAjk: "Day 5",
    Y5wiqIU7dAN: "Day 6",
    vHUFOwDZOc3: "Day 6 (Mop up day)",
    lUjup7J3S50: "Day 7",
    AXoc1QOgNgV: "Day 8 (Mop up day)",
    eSSFwmQpHNb: "Empty Vials",
    sdEKrqgmNxN: "Health Worker",
    oEMjNjU2n1l: "Mobiliser",
    BaOUxUBEAp1: "Other reason",
    HePDJphrRMS: "Parish Supervisor",
    BoDgo1kqT4s: "Partial use",
    CVphMdX3AqR: "Phase 1 (2022)",
    KGPe25jtndC: "Phase 2 (2023)",
    CU21ehevOUt: "Phase 3 (2024)",
    f0y7OUk8wtM: "Reactive (2021)",
    m7S4M4aWa4q: "Round 0 (2019)",
    G1R6RsITi8T: "Round 1",
    gqfR4Qrz6Nm: "Round 1 (2019)",
    W1PA9ZE0plu: "Round 2",
    sRZAXWz62eu: "Round 2 (2022)",
    pSRm6b16Baw: "Unusable Vials",
    f65rwx7h4rV: "Usable Vials",
    mlwTknbcGP4: "VVM Color Change",
    rKD38rD7HZ5: "Village Health Team",
    xYerKDKCefk: "default",

    WdilrXx08R4: "15",

    Q18G7d3DPOg: "10",
    lYoAOhykYUW: "21",

    HolY9bB9ndg: "05",

    tWRpQ8HFWk4: "18",

    Et0jLLFoPiQ: "19",

    B04qyv8sHLZ: "07",

    um8prFWwCYU: "01",

    gjqIp8H7948: "04",

    QYISgIjXTJC: "13",

    wRshJ7SJcHq: "06",

    FJ1pjZ5Edzf: "11",

    N7r57cuvssW: "23",

    wXeABLEj9Vj: "03",

    I8NkRKchMoU: "22",

    nOnQwK1sDaN: "17",

    m3xNIoQ2esR: "12",

    PQxdLS3vke3: "08",

    w6VmDxFste0: "14",

    h4lJWKnqnxx: "16",
    QgvBHBb5xcS: "02",
    UEDzAaR5GpB: "09",
    gypjprrtiKV: "20",
};

export const processMap = (
    geojson: any,
    otherLevels: any,
    data: any[],
    thresholds: Threshold[]
) => {
    const mapCenter = center(geojson).geometry.coordinates;
    const organisationUnits = Object.values(otherLevels).flatMap(
        ({ organisationUnits }: any) => organisationUnits
    );
    const { features, ...rest } = geojson;
    const processedData = fromPairs(
        data.map((d) => {
            const value = d.value || d.total;
            const id = d.c || d.ou;
            return [id, value];
        })
    );

    const processedFeatures = features.map(
        ({ id, properties, ...others }: any) => {
            let value = processedData[id];
            let color = "white";

            if (value) {
                color = findColor(value, thresholds);
            }

            return {
                id,
                ...others,
                properties: {
                    ...properties,
                    value: value ? value : "No Data",
                    color,
                },
            };
        }
    );
    return {
        geojson: { ...rest, features: processedFeatures },
        mapCenter,
        organisationUnits,
    };
};

export const deriveSingleValues = (
    data: { [key: string]: any },
    expression?: string
) => {
    if (expression !== undefined) {
        let finalExpression = expression;
        const all = expression.match(/#{\w+.?\w*}/g);
        if (all) {
            all.forEach((s) => {
                const val =
                    data[
                        s.replace("#", "").replace("{", "").replace("}", "")
                    ] || 0;
                finalExpression = finalExpression.replace(s, val);
            });
        }
        try {
            const evaluation = evaluate(finalExpression);
            return [{ value: evaluation }];
        } catch (error) {
            return [{ value: "" }];
        }
    }
};

export const swatchColors: string[][] = [
    [
        "#000000",
        "#c0c0c0",
        "#808080",
        "#ffffff",
        "#800000",
        "#ff0000",
        "#800080",
        "#ff00ff",
        "#008000",
        "#00ff00",
        "#808000",
        "#ffff00",
        "#000080",
        "#0000ff",
        "#008080",
        "#00ffff",
    ],
    [
        "#FF0000",
        "#ffebee",
        "#ffcdd2",
        "#ef9a9a",
        "#e57373",
        "#ef5350",
        "#f44336",
        "#e53935",
        "#d32f2f",
        "#c62828",
        "#b71c1c",
    ],
    ["#ff8a80", "#ff5252", "#ff1744", "#d50000"],
    [
        "#e91e63",
        "#fce4ec",
        "#f8bbd0",
        "#f48fb1",
        "#f06292",
        "#ec407a",
        "#e91e63",
        "#d81b60",
        "#c2185b",
        "#ad1457",
        "#880e4f",
    ],
    ["#ff80ab", "#ff4081", "#f50057", "#c51162"],
    [
        "#9c27b0",
        "#f3e5f5",
        "#e1bee7",
        "#ce93d8",
        "#ba68c8",
        "#ab47bc",
        "#9c27b0",
        "#8e24aa",
        "#7b1fa2",
        "#6a1b9a",
        "#4a148c",
    ],
    ["#ea80fc", "#e040fb", "#d500f9", "#aa00ff"],
    [
        "#673ab7",
        "#ede7f6",
        "#d1c4e9",
        "#b39ddb",
        "#9575cd",
        "#7e57c2",
        "#673ab7",
        "#5e35b1",
        "#512da8",
        "#4527a0",
        "#311b92",
    ],
    ["#b388ff", "#7c4dff", "#651fff", "#6200ea"],
    [
        "#3f51b5",
        "#e8eaf6",
        "#c5cae9",
        "#9fa8da",
        "#7986cb",
        "#5c6bc0",
        "#3f51b5",
        "#3949ab",
        "#303f9f",
        "#283593",
        "#1a237e",
    ],
    ["#8c9eff", "#536dfe", "#3d5afe", "#304ffe"],
    [
        "#2196f3",
        "#e3f2fd",
        "#bbdefb",
        "#90caf9",
        "#64b5f6",
        "#42a5f5",
        "#2196f3",
        "#1e88e5",
        "#1976d2",
        "#1565c0",
        "#0d47a1",
    ],
    ["#82b1ff", "#448aff", "#2979ff", "#2962ff"],
    [
        "#03a9f4",
        "#e1f5fe",
        "#b3e5fc",
        "#81d4fa",
        "#4fc3f7",
        "#29b6f6",
        "#03a9f4",
        "#039be5",
        "#0288d1",
        "#0277bd",
        "#01579b",
    ],
    ["#80d8ff", "#40c4ff", "#00b0ff", "#0091ea"],
    [
        "#00bcd4",
        "#e0f7fa",
        "#b2ebf2",
        "#80deea",
        "#4dd0e1",
        "#26c6da",
        "#00bcd4",
        "#00acc1",
        "#0097a7",
        "#00838f",
        "#006064",
    ],
    ["#84ffff", "#18ffff", "#00e5ff", "#00b8d4"],
    [
        "#009688",
        "#e0f2f1",
        "#b2dfdb",
        "#80cbc4",
        "#4db6ac",
        "#26a69a",
        "#009688",
        "#00897b",
        "#00796b",
        "#00695c",
        "#004d40",
    ],
    ["#a7ffeb", "#64ffda", "#1de9b6", "#00bfa5"],
    [
        "#4caf50",
        "#e8f5e9",
        "#c8e6c9",
        "#a5d6a7",
        "#81c784",
        "#66bb6a",
        "#4caf50",
        "#43a047",
        "#388e3c",
        "#2e7d32",
        "#1b5e20",
    ],
    ["#b9f6ca", "#69f0ae", "#00e676", "#00c853"],
    [
        "#8bc34a",
        "#f1f8e9",
        "#dcedc8",
        "#c5e1a5",
        "#aed581",
        "#9ccc65",
        "#8bc34a",
        "#7cb342",
        "#689f38",
        "#558b2f",
        "#33691e",
    ],
    ["#ccff90", "#b2ff59", "#76ff03", "#64dd17"],
    [
        "#cddc39",
        "#f9fbe7",
        "#f0f4c3",
        "#e6ee9c",
        "#dce775",
        "#d4e157",
        "#cddc39",
        "#c0ca33",
        "#afb42b",
        "#9e9d24",
        "#827717",
    ],
    ["#f4ff81", "#eeff41", "#c6ff00", "#aeea00"],
    [
        "#ffeb3b",
        "#fffde7",
        "#fff9c4",
        "#fff59d",
        "#fff176",
        "#ffee58",
        "#ffeb3b",
        "#fdd835",
        "#fbc02d",
        "#f9a825",
        "#f57f17",
    ],
    ["#ffff8d", "#ffff00", "#ffea00", "#ffd600"],
    [
        "#ffc107",
        "#fff8e1",
        "#ffecb3",
        "#ffe082",
        "#ffd54f",
        "#ffca28",
        "#ffc107",
        "#ffb300",
        "#ffa000",
        "#ff8f00",
        "#ff6f00",
    ],
    ["#ffe57f", "#ffd740", "#ffc400", "#ffab00"],
    [
        "#ff9800",
        "#fff3e0",
        "#ffe0b2",
        "#ffcc80",
        "#ffb74d",
        "#ffa726",
        "#ff9800",
        "#fb8c00",
        "#f57c00",
        "#ef6c00",
        "#e65100",
    ],
    ["#ffd180", "#ffab40", "#ff9100", "#ff6d00"],
    [
        "#ff5722",
        "#fbe9e7",
        "#ffccbc",
        "#ffab91",
        "#ff8a65",
        "#ff7043",
        "#ff5722",
        "#f4511e",
        "#e64a19",
        "#d84315",
        "#bf360c",
    ],
    ["#ff9e80", "#ff6e40", "#ff3d00", "#dd2c00"],
    [
        "#795548",
        "#efebe9",
        "#d7ccc8",
        "#bcaaa4",
        "#a1887f",
        "#8d6e63",
        "#795548",
        "#6d4c41",
        "#5d4037",
        "#4e342e",
        "#3e2723",
    ],
    ["#d7ccc8", "#bcaaa4", "#8d6e63", "#5d4037"],
    [
        "#9e9e9e",
        "#fafafa",
        "#f5f5f5",
        "#eeeeee",
        "#e0e0e0",
        "#bdbdbd",
        "#757575",
        "#616161",
        "#424242",
        "#212121",
    ],
    ["#f5f5f5", "#eeeeee", "#bdbdbd", "#616161"],
    [
        "#607d8b",
        "#eceff1",
        "#cfd8dc",
        "#b0bec5",
        "#90a4ae",
        "#78909c",
        "#546e7a",
        "#455a64",
        "#37474f",
        "#263238",
    ],
    ["#cfd8dc", "#b0bec5", "#78909c", "#455a64"],
];

export const computeGlobalParams = (
    searchResource: string,
    searchId: string
) => {
    const visualizationDatum = useStore($visualizationQuery);
    const items = Object.values(visualizationDatum.dataDimensions || {}).filter(
        ({ resource }) => resource === searchResource
    );
    const previousType =
        items.length > 0
            ? (items[0].type as "filter" | "dimension")
            : "dimension";

    const selected = items.map(({ id, periodType, label }) => {
        const pe: Period = {
            value: id,
            label: label || "",
            type: periodType || "fixed",
        };
        return pe;
    });
    const isGlobal =
        selected.find(({ value }) => value === searchId) !== undefined;

    return { previousType, selected, isGlobal };
};

const events = (data: any) => {
    return data.events.flatMap(({ dataValues, eventDate, ...rest }: any) => {
        return dataValues.map((dv: any) => {
            return {
                ...dv,
                ...rest,
                eventDate,
                ...generatePeriods(eventDate),
            };
        });
    });
};

const dataElementGroupElements = (data: any) => {
    const {
        id: dataElementGroupId,
        name: dataElementGroupName,
        code: dataElementGroupCode,
        dataElements,
    } = data;
    return dataElements.flatMap(({ id, name, code }: any) => ({
        id,
        name,
        code,
        dataElementGroupId,
        dataElementGroupName,
        dataElementGroupCode,
    }));
};

const dataElements = (data: any) => {
    return data.dataElements;
};

export const datElementGroupSetsDataElementGroupsWithAttributes = (
    data: any
) => {
    return data.dataElements.map(
        ({
            id,
            name,
            attributeValues: elementAttributes,
            dataElementGroups,
        }: any) => {
            let subKeyResultArea: string = "";
            let keyResultArea: string = "";
            let attributeName: string = "";
            let deAttributeName = "";
            let deAttributeValue = "";
            let value: string = "";
            let shortName = "";

            if (elementAttributes.length > 0) {
                const [
                    {
                        value: val1,
                        attribute: { name },
                    },
                ] = elementAttributes;
                deAttributeName = name;
                deAttributeValue = val1;
            }

            if (dataElementGroups && dataElementGroups.length > 0) {
                const filtered = dataElementGroups.filter(
                    ({ id }: any) => id !== "ZTv2IkjG5K7"
                );

                if (filtered.length > 0) {
                    const [
                        {
                            name: dataElementGroupName,
                            groupSets,
                            shortName: dataElementGroupShortName,
                        },
                    ] = filtered;

                    subKeyResultArea = dataElementGroupName;
                    shortName = dataElementGroupShortName;

                    if (groupSets && groupSets.length > 0) {
                        const [
                            { name: dataElementGroupSetName, attributeValues },
                        ] = groupSets;

                        keyResultArea = dataElementGroupSetName;

                        if (attributeValues.length > 0) {
                            const [
                                {
                                    value: val1,
                                    attribute: { name },
                                },
                            ] = attributeValues;
                            attributeName = name;
                            value = val1;
                        }
                    }
                }
            }
            return {
                id,
                name,
                subKeyResultArea,
                shortName,
                keyResultArea,
                [attributeName]: value,
                [deAttributeName]: deAttributeValue,
            };
        }
    );
};

const dataElementGroupsDataElements = (data: any) => {
    return data.dataElementGroups.flatMap(
        ({
            dataElements,
            id: dataElementGroupId,
            name: dataElementGroupName,
            code: dataElementGroupCode,
        }: any) => {
            return dataElements.map(({ id, name, code }: any) => {
                return {
                    id,
                    name,
                    code,
                    dataElementGroupId,
                    dataElementGroupName,
                    dataElementGroupCode,
                };
            });
        }
    );
};

export const processDirectives = (data: any) => {
    return Object.entries(groupBy(data, (d) => `${d["dx"]}${d["pe"]}`)).map(
        ([_, group]) => {
            const gp = group[0];
            return {
                ...gp,
                label: getValue(Number(gp.value)),
            };
        }
    );
};

const allOptions: Partial<{ [key: string]: (data: any) => any[] }> = {
    events,
    dataElementGroupElements,
    datElementGroupSetsDataElementGroupsWithAttributes,
    dataElements,
    dataElementGroupsDataElements,
    processDirectives,
};

export const processAnalyticsData = ({
    headers,
    rows,
    metaData,
    options,
}: {
    headers: any[];
    rows: string[][];
    metaData: any;
    options: Partial<{
        includeEmpty: boolean;
        flatteningOption: string;
        valueIfEmpty: string;
    }>;
}) => {
    const finalHeaders = headers.filter((header) => header.meta);
    let values: { [key: string]: string } = {};
    if (rows) {
        values = fromPairs(
            rows.map((r) => [
                r.slice(0, r.length - 1).join(""),
                r[r.length - 1],
            ])
        );
    }

    if (finalHeaders.length === 1) {
        const label1 = finalHeaders[0].name;
        const first = metaData.dimensions[label1] || [];
        let currentData = [];
        for (const item of first) {
            currentData.push({
                [label1]: item,
                [`${label1}-name`]: metaData.items[item]?.name,
                value: values[item] || options.valueIfEmpty,
            });
        }
        return currentData;
    }
    if (finalHeaders.length === 2) {
        const label1 = finalHeaders[0].name;
        const label2 = finalHeaders[1].name;
        const first: string[] = metaData.dimensions[label1] || [];
        const second: string[] = metaData.dimensions[label2] || [];
        let currentData = [];

        for (const item of first) {
            for (const item2 of second) {
                currentData.push({
                    [label1]: item,
                    [label2]: item2,
                    [`${label1}-name`]: metaData.items[item]?.name,
                    [`${label2}-name`]: metaData.items[item2]?.name,
                    value: values[`${item}${item2}`] || options.valueIfEmpty,
                });
            }
        }

        return currentData;
    }
    if (finalHeaders.length === 3) {
        const label0 = finalHeaders[0].name;
        const label1 = finalHeaders[1].name;
        const label2 = finalHeaders[2].name;
        const first: string[] = metaData.dimensions[label0] || [];
        const second: string[] = metaData.dimensions[label1] || [];
        const third: string[] = metaData.dimensions[label2] || [];
        let currentData = [];
        for (const item0 of first) {
            for (const item1 of second) {
                for (const item2 of third) {
                    currentData.push({
                        [label0]: item0,
                        [label1]: item1,
                        [label2]: item2,
                        [`${label0}-name`]: metaData.items[item0]?.name,
                        [`${label1}-name`]: metaData.items[item1]?.name,
                        [`${label2}-name`]: metaData.items[item2]?.name,
                        value:
                            values[`${item0}${item1}${item2}`] ||
                            options.valueIfEmpty,
                    });
                }
            }
        }
        return currentData;
    }

    if (finalHeaders.length === 4) {
        const label0 = finalHeaders[0].name;
        const label1 = finalHeaders[1].name;
        const label2 = finalHeaders[2].name;
        const label3 = finalHeaders[3].name;
        const first: string[] = metaData.dimensions[label0] || [];
        const second: string[] = metaData.dimensions[label1] || [];
        const third: string[] = metaData.dimensions[label2] || [];
        const fourth: string[] = metaData.dimensions[label3] || [];
        let currentData = [];
        for (const item0 of first) {
            for (const item1 of second) {
                for (const item2 of third) {
                    for (const item3 of fourth) {
                        currentData.push({
                            [label0]: item0,
                            [label1]: item1,
                            [label2]: item2,
                            [label3]: item3,
                            [`${label0}-name`]: metaData.items[item0]?.name,
                            [`${label1}-name`]: metaData.items[item1]?.name,
                            [`${label2}-name`]: metaData.items[item2]?.name,
                            [`${label3}-name`]: metaData.items[item3]?.name,
                            value:
                                values[`${item0}${item1}${item2}${item3}`] ||
                                options.valueIfEmpty,
                        });
                    }
                }
            }
        }
        return currentData;
    }
};

export const flattenDHIS2Data = (
    data: any,
    options: Partial<{
        includeEmpty: boolean;
        flatteningOption: string;
        valueIfEmpty: string;
    }>
) => {
    if (data && (data.headers || data.listGrid)) {
        let rows: string[][] = [];
        let headers: any[] = [];

        if (data.listGrid) {
            headers = data.listGrid.headers;
            rows = data.listGrid.rows;
        } else {
            headers = data.headers;
            rows = data.rows;
        }
        if (
            options.includeEmpty &&
            headers !== undefined &&
            data.metaData.dimensions
        ) {
            data = processAnalyticsData({
                headers,
                rows,
                options,
                metaData: data.metaData,
            });
        } else {
            if (headers !== undefined && rows !== undefined) {
                data = rows.map((row: string[]) => {
                    let others = {};

                    if (data.metaData && data.metaData.items) {
                        row.forEach((r, index) => {
                            if (index < row.length - 1) {
                                others = {
                                    ...others,
                                    [`${headers?.[index].name}-name`]:
                                        data.metaData.items[r]?.name || "",
                                };
                            }
                        });
                    }
                    return {
                        ...others,
                        ...fromPairs(
                            row.map((value, index) => {
                                const header = headers?.[index];
                                return [header.name, value];
                            })
                        ),
                    };
                });
            }
        }
    }
    if (options.flatteningOption) {
        return allOptions[options.flatteningOption]?.(data) || data;
    }
    return data;
};

export const common = createOptions(["baseline", "normal", "stretch"]);
export const contentPosition = createOptions([
    "center",
    "end",
    "flex-end",
    "flex-start",
    "start",
]);

export const selfPositions = createOptions([
    "center",
    "end",
    "flex-end",
    "flex-start",
    "self-end",
    "self-start",
    "start",
]);

export const justifySelf = createOptions([
    "auto",
    "baseline",
    "left",
    "normal",
    "right",
    "stretch",
]);

export const alignment = createOptions(["left", "normal", "right"]);

export const contentDistribution = createOptions([
    "space-around",
    "space-between",
    "space-evenly",
    "stretch",
]);

export const justifyItemsOptions = [
    ...createOptions([
        "baseline",
        "left",
        "legacy",
        "normal",
        "right",
        "stretch",
    ]),
    ...selfPositions,
];
export const alignItemsOptions = [...selfPositions, ...common];

export const justifyContentOptions = [
    ...contentDistribution,
    ...contentPosition,
];
export const alignContentOptions = [
    ...contentDistribution,
    ...contentPosition,
    ...createOptions(["baseline", "normal"]),
];

export const createOptions2 = (labels: string[], values: string[]) => {
    if (labels.length === values.length) {
        return labels.map((label, index) => {
            return {
                label,
                value: values[index],
            };
        });
    }
    return [];
};

export const generatePeriods = (date: string) => {
    const period = dayjs(date);
    const month = period.format("YYYYMM");
    const quarter = period.format("YYYY[Q]Q");
    const year = period.format("YYYY");
    const week = period.format("YYYY[W]W");
    let financialYear = "";
    const currentMonth = period.month();
    const currentYear = period.year();
    const nextYear = currentYear + 1;

    const isAfterFinancialYearStart = period.isAfter(
        dayjs().month(5).date(30).subtract(1, "year")
    );
    const isBeforeFinancialYearEnd = period.isBefore(dayjs().month(5).date(30));

    if (isAfterFinancialYearStart && isBeforeFinancialYearEnd) {
        financialYear = `FY ${currentYear - 1}/${currentYear}`;
    } else {
        financialYear = `FY ${currentYear}/${nextYear}`;
    }

    return { month, quarter, year, week, financialYear };
};

export const merge2DataSources = (
    from: any[],
    to: any[],
    fromColumn: string,
    toColumn: string,
    fromFirst: boolean
) => {
    if (fromFirst) {
        return from.flatMap((e) => {
            const filtered = to.filter((ev) => {
                return ev[toColumn] === e[fromColumn];
            });
            if (filtered.length > 0) {
                return filtered.map((f) => {
                    return { ...f, ...e };
                });
            }
            return e;
        });
    }
    return to.flatMap((e) => {
        const filtered = from.filter((ev) => {
            return ev[fromColumn] === e[toColumn];
        });
        if (filtered.length > 0) {
            return filtered.map((f) => {
                return { ...f, ...e };
            });
        }
        return e;
    });
};

/*
 * Get an array of last periods
 *
 * @param n the number to look back e.g n months back
 * @param periodType the type of periods. one of weeks, months, quarters, years
 * @paran includeCurrent whether to include current period. e.g if true last_3_months includes the current month
 * @return a list of relative periods
 */
const lastNPeriods = (
    n: number,
    periodType: ManipulateType,
    includeCurrent: boolean = false
) => {
    /*The momentjs fomarts for the periodsTypes*/
    const dateFormats: { [key: string]: string } = {
        days: "YYYYMMDD",
        weeks: "YYYY[W]W",
        months: "YYYYMM",
        years: "YYYY",
        quarters: "YYYY[Q]Q",
    };

    const periods = new Set<string>();
    /* toLocaleUpperCase() is added because of special treatment to quarters formating*/
    if (n === 0) {
        periods.add(dayjs().format(dateFormats[periodType]));
        return Array.from(periods);
    }
    for (let i = n; i >= 1; i--) {
        periods.add(
            dayjs().subtract(i, periodType).format(dateFormats[periodType])
        );
    }
    if (includeCurrent) {
        periods.add(dayjs().format(dateFormats[periodType]));
    }
    return Array.from(periods);
};

export const relativePeriods2: any = {
    TODAY: lastNPeriods(0, "days"),
    YESTERDAY: lastNPeriods(1, "days"),
    LAST_3_DAYS: lastNPeriods(3, "days"),
    LAST_7_DAYS: lastNPeriods(7, "days"),
    LAST_14_DAYS: lastNPeriods(14, "days"),
    LAST_30_DAYS: lastNPeriods(30, "days"),
    LAST_60_DAYS: lastNPeriods(60, "days"),
    LAST_90_DAYS: lastNPeriods(90, "days"),
    LAST_180_DAYS: lastNPeriods(180, "days"),
    THIS_WEEK: lastNPeriods(0, "weeks"),
    LAST_WEEK: lastNPeriods(1, "weeks"),
    LAST_4_WEEKS: lastNPeriods(4, "weeks"),
    LAST_12_WEEKS: lastNPeriods(12, "weeks"),
    LAST_52_WEEKS: lastNPeriods(52, "weeks"),
    WEEKS_THIS_YEAR: lastNPeriods(dayjs().isoWeek() - 1, "weeks", true),
    THIS_MONTH: lastNPeriods(0, "months"),
    LAST_MONTH: lastNPeriods(1, "months"),
    LAST_3_MONTHS: lastNPeriods(3, "months"),
    LAST_6_MONTHS: lastNPeriods(6, "months"),
    LAST_12_MONTHS: lastNPeriods(12, "months"),
    MONTHS_THIS_YEAR: lastNPeriods(dayjs().month(), "months", true),
    THIS_YEAR: lastNPeriods(0, "years"),
    LAST_YEAR: lastNPeriods(1, "years"),
    LAST_5_YEARS: lastNPeriods(5, "years"),
    LAST_10_YEARS: lastNPeriods(10, "years"),
    THIS_QUARTER: lastNPeriods(0, "months"),
    LAST_QUARTER: lastNPeriods(1 * 3, "months"),
    LAST_4_QUARTERS: lastNPeriods(4 * 3, "months"),
    QUARTERS_THIS_YEAR: lastNPeriods(
        (dayjs().quarter() - 1) * 3,
        "months",
        true
    ),
};

export const relativePeriods: { [key: string]: Option[] } = {
    DAILY: [
        { value: "TODAY", label: "Today" },
        { value: "YESTERDAY", label: "Yesterday" },
        { value: "LAST_3_DAYS", label: "Last 3 days" },
        { value: "LAST_7_DAYS", label: "Last 7 days" },
        { value: "LAST_14_DAYS", label: "Last 14 days" },
        { value: "LAST_30_DAYS", label: "Last 30 days" },
        { value: "LAST_60_DAYS", label: "Last 60 days" },
        { value: "LAST_90_DAYS", label: "Last 90 days" },
        { value: "LAST_180_DAYS", label: "Last 180 days" },
    ],
    WEEKLY: [
        { value: "THIS_WEEK", label: "This week" },
        { value: "LAST_WEEK", label: "Last week" },
        { value: "LAST_4_WEEKS", label: "Last 4 weeks" },
        { value: "LAST_12_WEEKS", label: "Last 12 weeks" },
        { value: "LAST_52_WEEKS", label: "Last 52 weeks" },
        { value: "WEEKS_THIS_YEAR", label: "Weeks this year" },
    ],
    BIWEEKLY: [
        { value: "THIS_BIWEEK", label: "This bi-week" },
        { value: "LAST_BIWEEK", label: "Last bi-week" },
        { value: "LAST_4_BIWEEKS", label: "Last 4 bi-weeks" },
    ],
    MONTHLY: [
        { value: "THIS_MONTH", label: "This month" },
        { value: "LAST_MONTH", label: "Last month" },
        { value: "LAST_3_MONTHS", label: "Last 3 months" },
        { value: "LAST_6_MONTHS", label: "Last 6 months" },
        { value: "LAST_12_MONTHS", label: "Last 12 months" },
        {
            value: "MONTHS_THIS_YEAR",
            label: "Months this year",
        },
    ],
    BIMONTHLY: [
        { value: "THIS_BIMONTH", label: "This bi-month" },
        { value: "LAST_BIMONTH", label: "Last bi-month" },
        {
            value: "LAST_6_BIMONTHS",
            label: "Last 6 bi-months",
        },
        {
            value: "BIMONTHS_THIS_YEAR",
            label: "Bi-months this year",
        },
    ],
    QUARTERLY: [
        { value: "THIS_QUARTER", label: "This quarter" },
        { value: "LAST_QUARTER", label: "Last quarter" },
        { value: "LAST_4_QUARTERS", label: "Last 4 quarters" },
        {
            value: "QUARTERS_THIS_YEAR",
            label: "Quarters this year",
        },
    ],
    SIXMONTHLY: [
        { value: "THIS_SIX_MONTH", label: "This six-month" },
        { value: "LAST_SIX_MONTH", label: "Last six-month" },
        {
            value: "LAST_2_SIXMONTHS",
            label: "Last 2 six-month",
        },
    ],
    FINANCIAL: [
        {
            value: "THIS_FINANCIAL_YEAR",
            label: "This financial year",
        },
        {
            value: "LAST_FINANCIAL_YEAR",
            label: "Last financial year",
        },
        {
            value: "LAST_5_FINANCIAL_YEARS",
            label: "Last 5 financial years",
        },
    ],
    YEARLY: [
        { value: "THIS_YEAR", label: "This year" },
        { value: "LAST_YEAR", label: "Last year" },
        { value: "LAST_5_YEARS", label: "Last 5 years" },
        { value: "LAST_10_YEARS", label: "Last 10 years" },
    ],
};

export const relativePeriodTypes = Object.keys(relativePeriods);
export const getRelativePeriods = (periodString: string) => {
    return relativePeriods2[periodString] || relativePeriods["LAST_MONTH"];
};

export const fixedPeriods = [
    "DAILY",
    "WEEKLY",
    "WEEKLYWED",
    "WEEKLYTHU",
    "WEEKLYSAT",
    "WEEKLYSUN",
    "BIWEEKLY",
    "MONTHLY",
    "BIMONTHLY",
    "QUARTERLY",
    "QUARTERLYNOV",
    "SIXMONTHLY",
    "SIXMONTHLYAPR",
    "SIXMONTHLYNOV",
    "YEARLY",
    "FYNOV",
    "FYOCT",
    "FYJUL",
    "FYAPR",
];

export const findUniqValue = (data: any[], key: string) => {
    return uniq(data.map((d) => d[key]));
};

export const flatteningOptions: Option[] = [
    { value: "events", label: "Events" },
    {
        value: "trackedEntityInstanceAttributes",
        label: "Tracked EntityInstances Attributes",
    },
    {
        value: "trackedEntityInstanceAttributesWithEvents",
        label: "Tracked EntityInstances Attributes With Events ",
    },
    {
        value: "trackedEntityInstanceAttributesWithEvents",
        label: "Tracked EntityInstances Attributes With Events ",
    },
    {
        value: "datElementGroupSetsDataElementGroupsWithAttributes",
        label: "Data Element Group Sets - Data Element Groups with Attributes ",
    },
    {
        value: "dataElementGroupElements",
        label: "Data Element Group - Data Elements",
    },
    {
        value: "dataElements",
        label: "Data Elements",
    },
    {
        value: "dataElementGroupsDataElements",
        label: "Data Element Groups - Data Elements",
    },
    {
        value: "processDirectives",
        label: "Directives",
    },
];

export const createAxios = (authentication: Authentication | undefined) => {
    if (authentication) {
        return axios.create({
            baseURL: `${authentication.url}/api/`,
            auth: {
                username: authentication.username,
                password: authentication.password,
            },
            string: "",
        });
    }
    return undefined;
};

export const getAnalyticsQuery = ({
    columns,
    rows,
    filters,
    aggregationType,
}: {
    columns: VisualizationItems;
    rows: VisualizationItems;
    filters: VisualizationItems;
    aggregationType: string;
}) => {
    let final: string[] = [];
    if (aggregationType && aggregationType !== "DEFAULT") {
        [`aggregationType=${aggregationType}`];
    }
    const c = columns
        .map(
            ({ items, dimension }) =>
                `${dimension}:${items.map(({ id }) => id).join(";")}`
        )
        .join(",");

    const r = rows
        .map(
            ({ items, dimension }) =>
                `${dimension}:${items.map(({ id }) => id).join(";")}`
        )
        .join(",");

    const f = filters
        .map(
            ({ items, dimension }) =>
                `${dimension}:${items.map(({ id }) => id).join(";")}`
        )
        .join(",");

    if (c && r) {
        final = [...final, `dimension=${c},${r}`];
    } else if (c) {
        final = [...final, `dimension=${c}`];
    } else if (r) {
        final = [...final, `dimension=${r}`];
    }
    if (f) {
        final = [...final, `filter=${f}`];
    }

    return final.join("&");
};

export const findParameters = (visualization: any) => {
    const colors =
        colorSets[visualization.colorSet]?.colors ||
        colorSets["DEFAULT"].colors;
    switch (visualization.type) {
        case "COLUMN":
            return {
                type: "bar",
                ["data.orientation"]: "v",
                category:
                    visualization.rows.length > 0
                        ? `${visualization.rows[0].dimension}-name`
                        : undefined,
                series:
                    visualization.columns.length > 0
                        ? `${visualization.columns[0].dimension}-name`
                        : undefined,
                ["layout.colorway"]: colors,
                summarize: false,
            };
        case "LINE":
            return {
                type: "line",
                category:
                    visualization.rows.length > 0
                        ? `${visualization.rows[0].dimension}-name`
                        : undefined,
                series:
                    visualization.columns.length > 0
                        ? `${visualization.columns[0].dimension}-name`
                        : undefined,
                ["layout.colorway"]: colors,
                summarize: false,
            };
        case "STACKED_COLUMN":
            return {
                type: "bar",
                ["layout.barmode"]: "stack",
                ["data.orientation"]: "v",
                category:
                    visualization.rows.length > 0
                        ? `${visualization.rows[0].dimension}-name`
                        : undefined,
                series:
                    visualization.columns.length > 0
                        ? `${visualization.columns[0].dimension}-name`
                        : undefined,
                ["layout.colorway"]: colors,
                summarize: false,
            };
        case "BAR":
            return {
                type: "bar",
                ["data.orientation"]: "h",
                category:
                    visualization.rows.length > 0
                        ? `${visualization.rows[0].dimension}-name`
                        : undefined,
                series:
                    visualization.columns.length > 0
                        ? `${visualization.columns[0].dimension}-name`
                        : undefined,
                ["layout.colorway"]: colors,
                summarize: false,
            };
        case "STACKED_BAR":
            return {
                type: "bar",
                ["layout.barmode"]: "stack",
                ["data.orientation"]: "h",
                category:
                    visualization.rows.length > 0
                        ? `${visualization.rows[0].dimension}-name`
                        : undefined,
                series:
                    visualization.columns.length > 0
                        ? `${visualization.columns[0].dimension}-name`
                        : undefined,
                ["layout.colorway"]: colors,
                summarize: false,
            };
        case "AREA":
            return { type: "area" };
        case "STACKED_AREA":
            return { type: "bar" };
        case "PIE":
            return {
                type: "pie",
                summarize: false,
                labels:
                    visualization.columns.length > 0
                        ? `${visualization.columns[0].dimension}-name`
                        : undefined,
                values: "value",
            };
        case "RADAR":
            return { type: "bar" };
        case "GAUGE":
            return { type: "gauge" };
        case "YEAR_OVER_YEAR_LINE":
            return { type: "line" };
        case "YEAR_OVER_YEAR_COLUMN":
            return { type: "bar" };
        case "SCATTER":
            return { type: "line" };
        case "BUBBLE":
            return { type: "line" };
        case "SINGLE_VALUE":
            return { type: "single" };
        case "PIVOT_TABLE":
            return {
                type: "tables",
                rows: visualization.rows
                    .map((row: any) => `${row.dimension}-name`)
                    .join(","),
                columns: visualization.columns
                    .map((column: any) => `${column.dimension}-name`)
                    .join(","),
                showHeaders: true,
                summarize: true,
                aggregation: "sum",
                aggregationColumn: "value",
                cellHeight: "sm",
            };

        default:
            return {};
    }
};

export const processAnalytics = ({
    data,
    visualization,
    dimensions,
    items,
}: {
    data: any;
    dimensions: { [key: string]: string[] };
    visualization: {
        type: string;
        columns: VisualizationItems;
        rows: VisualizationItems;
    };
    items: { [key: string]: { name: string } };
}) => {
    if (visualization.type === "GAUGE" && data.length === 1) {
        return {
            data: [
                {
                    domain: { x: [0, 1], y: [0, 1] },
                    value: data[0]["value"] || 0,
                    title: {
                        text: data[0]["dx-name" || "pe-name" || "ou-name"],
                    },
                    type: "indicator",
                    mode: "gauge+number",
                    delta: { reference: 10 },
                    gauge: { axis: { range: [null, 100] } },
                },
            ],
            series: dimensions[visualization.columns[0].dimension].map(
                (v) => items[v].name
            ),
        };
    }
    if (visualization.columns.length === 1 && visualization.rows.length === 1) {
        const firstColumn = visualization.columns[0];
        const firstRow = visualization.rows[0];
        const groupedData = groupBy(data, firstColumn.dimension);

        // const processedData = dimensions[
        //     visualization.columns[0].dimension
        // ].map((val) => {
        //     const current = groupedData[val];
        //     const c = items[val].name;
        //     return {
        //         x: dimensions[visualization.rows[0].dimension].map(
        //             (v) => items[v].name
        //         ),
        //         y: dimensions[visualization.rows[0].dimension].map((val) => {
        //             const currentValue = current?.find(
        //                 (vals) => vals[firstRow.dimension] === val
        //             );
        //             return currentValue?.value || "";
        //         }),
        //         name: c,
        //         type: otherParameters[visualization.type]?.type || "bar",
        //         textposition: "auto",
        //         texttemplate: "%{y:.0f}",
        //     };
        // });
        return {
            data: [],
            series: dimensions[visualization.columns[0].dimension].map(
                (v) => items[v].name
            ),
        };
    }
    return {
        data: [],
        series: [],
    };
};
