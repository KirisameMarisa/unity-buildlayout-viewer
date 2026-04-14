import ELK from "elkjs";
import { Node, Edge, Position } from "@xyflow/react";
import { AssetEntry, AssetLink } from "../types";

const elk = new ELK();
const nodeWidth = 200;
const nodeHeight = 80;

function measureTextWidth(text: string, font = '14px sans-serif') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = font;
    return context.measureText(text).width;
}

export function toNode(entry: AssetEntry): Node {
    const label = `[${entry.name}]`
    const width = measureTextWidth(label, '14px sans-serif') + 10;
    return {
        id: entry.rid!.toString(),
        data: { label: `[${entry.name}]` },
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
            background: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #38bdf8",
            borderRadius: 4,
            padding: 6,
            fontSize: 14,
            whiteSpace: "nowrap",
            width: width,
        },
    };
}

export function toEdge(link: AssetLink): Edge {
    const type = link.link_type!.split("_")[1] || "unknown";
    const colorMap: Record<string, string> = {
        Bundles: "#22d3ee",
        Dependencies: "#facc15",
        DependentBundles: "#a78bfa",
        ExternalReferences: "#34d399",
        OtherAssets: "#f87171",
        ExternallyReferencedAssets: "#fb923c",
        ReferencingAssets: "#60a5fa",
    };
    return {
        id: `${link.link_type}_${link.from_id}-${link.to_id}`,
        source: link.from_id!.toString(),
        target: link.to_id!.toString(),
        type: "default",
        style: { stroke: colorMap[type] || "#aaa" },
    };
}

export async function layoutNodes(
    nodes: Node[],
    edges: Edge[],
): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.spacing.nodeNode': '30',
            'elk.spacing.edgeNode': '100',
            'elk.layered.spacing.nodeNodeBetweenLayers': '200'
        },
        children: nodes.map((node) => ({
            id: node.id,
            width: node.width ?? 150,
            height: node.height ?? 60,
        })),
        edges: edges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
        })),
    };

    const result = await elk.layout(elkGraph);
    const positionMap = new Map(
        (result.children ?? []).map((child) => [child.id, { x: child.x, y: child.y }]),
    );

    const laidOutNodes = nodes.map((node) => {
        const pos = positionMap.get(node.id);
        return {
            ...node,
            position: {
                x: pos?.x ?? 0,
                y: pos?.y ?? 0,
            },
        };
    });
    return { nodes: laidOutNodes, edges };
}
