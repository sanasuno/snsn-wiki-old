/**
 * @types/graph.ts
 * グラフデータの型定義
 */

export interface GraphNode {
    id: string;
    label: string;
    tags: string[];
    group: string;
    linkCount: number;
    exists: boolean;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
    index?: number;
}

export interface GraphLink {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}