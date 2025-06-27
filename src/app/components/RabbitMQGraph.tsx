'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphLink, GraphNode } from '../lib/core/analyze';

interface RabbitMQGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
}

const RabbitMQGraph: React.FC<RabbitMQGraphProps> = ({ nodes, links, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) {
      return;
    }

    // ВАЖНО: D3 мутирует данные. Создаем глубокую копию, чтобы не изменять props.
    const nodesCopy: GraphNode[] = JSON.parse(JSON.stringify(nodes));
    const linksCopy: GraphLink[] = JSON.parse(JSON.stringify(links));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Очистка перед рендером

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // После инициализации симуляции D3 заменит строковые id в linksCopy
    // на ссылки на объекты узлов.
    const simulation = d3.forceSimulation<GraphNode>(nodesCopy)
      .force("link", d3.forceLink<GraphNode, GraphLink>(linksCopy)
        .id(d => d.id)
        .distance(150) // Увеличим расстояние для читаемости
      )
      .force("charge", d3.forceManyBody().strength(-250)) // Увеличим силу отталкивания
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Определяем маркер-стрелку для связей
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 23) // Смещаем стрелку дальше от центра узла
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999');

    // Рендерим связи
    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(linksCopy)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // 2. Рендерим подписи к связям
    const linkLabels = svg.append("g")
      .attr("class", "link-labels")
      .selectAll<SVGTextElement, GraphLink>("text")
      .data(linksCopy)
      .join("text")
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#555')
      .style('paint-order', 'stroke')
      .style('stroke', '#f9f9f9')
      .style('stroke-width', '3px')
      .text(d => d.label);

    // Рендерим узлы
    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodesCopy, d => d.id)
      .join("circle")
      .attr("r", 15) // Делаем узлы чуть больше
      .attr("fill", d => color(d.type))
      .call(drag(simulation)); // Теперь эта строка не вызовет ошибки типизации

    // Добавляем всплывающие подсказки
    node.append("title")
      .text(d => `Type: ${d.type}\nLabel: ${d.label}\nFile: ${d.details.file}`);

    // Рендерим метки для узлов
    const labels = svg.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodesCopy, (data) => {
        return (data as { id: string }).id
      })
      .join("text")
      .attr("dx", 20)
      .attr("dy", ".35em")
      .style("font-size", "12px")
      .style("pointer-events", "none") // Метки не должны перехватывать события мыши
      .text(d => d.label);

    // Обновляем позиции на каждом "тике" симуляции
    simulation.on("tick", () => {
      // ИСПРАВЛЕНИЕ ОШИБКИ 2: D3 уже заменил id на объекты.
      // Используем `as any`, чтобы сообщить TypeScript, что мы это знаем,
      // и он может безопасно получить доступ к свойствам .x и .y.
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);

      labels
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);

      linkLabels
        .attr("x", d => ((d.source as any).x + (d.target as any).x) / 2)
        .attr("y", d => ((d.source as any).y + (d.target as any).y) / 2);
    });

    // Функция для обработки перетаскивания узлов
    function drag(simulation: d3.Simulation<GraphNode, undefined>) {
      function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, any>, d: GraphNode) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, any>, d: GraphNode) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, any>, d: GraphNode) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      return d3.drag<SVGCircleElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

  }, [nodes, links, width, height]); // Эффект перезапустится при изменении данных

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', overflow: 'hidden' }}>
      <svg ref={svgRef} width={width} height={height}></svg>
    </div>
  );
};

export default RabbitMQGraph;
