/**
 * @lib/graphTypes.ts
 * グラフデータの型定義
 */

export interface GraphNode {
    id: string;
    label: string;
    tags: string[];
    group: string;
    linkCount: number;
    exists: boolean;
}

export interface GraphLink {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}