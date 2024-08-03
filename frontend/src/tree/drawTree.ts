/* eslint-disable no-param-reassign */
import * as d3 from 'd3';
// import { useTableStore } from '@/store/table';  // 不能在还没有激活pinia store前就使用，可以传参进来

import {
  typeMapColor,
  typeNodeStyle,
  edgeTextStyle,
  nodeTextStyle,
} from './style';
import {
  Point, TypeNode, RectDef, edgeType, KV,
} from './types';
import letterAspectRatio from './letterAspectRatio';
import { VisTreeNode, TableStore, TblCell } from "@/store/table";

type TransformTypes = keyof typeof typeMapColor;
type NodeData = {
  [key: string]: any,
  children: NodeData[],
  parent: NodeData | null,
  data: VisTreeNode
}


const getLetterWidth = (
  letter: string,
  fontSize: number,
) => fontSize * (letterAspectRatio[letter as keyof typeof letterAspectRatio] || 1);

const getTextSize = (text: string, fontSize: number) => {
  let width = 0;
  // eslint-disable-next-line prefer-regex-literals
  const pattern = new RegExp('[\u4E00-\u9FFF]+');
  text.split('')
    .forEach((letter) => {
      if (pattern.test(letter)) {
        // 中文字符
        width += fontSize;
      } else {
        width += getLetterWidth(letter, fontSize);
      }
    });
  return [width, fontSize];
};

const fittingString = (input: string, maxWidth: any, fontSize: any) => {
  const ellipsis = '...';
  const ellipsisLength = getTextSize(ellipsis, fontSize)[0];
  let currentWidth = 0;
  let result = input;
  // eslint-disable-next-line prefer-regex-literals
  const pattern = new RegExp('[\u4E00-\u9FFF]+');
  input.split('')
    .forEach((letter: string, i) => {
      if (currentWidth > maxWidth - ellipsisLength) {
        return;
      }
      if (pattern.test(letter)) {
        // Chinese charactors
        currentWidth += fontSize;
      } else {
        // get the width of single letter according to the fontSize
        currentWidth += getLetterWidth(letter, fontSize);
      }
      if (currentWidth > maxWidth - ellipsisLength) {
        result = `${input.slice(0, i)}${ellipsis}`;
      }
    });
  return result;
};

function diagonal(source: Point, target: Point) {
  const { x, y } = source;
  const { x: ex, y: ey } = target;

  const xrvs = ex - x < 0 ? -1 : 1;
  const yrvs = ey - y < 0 ? -1 : 1;

  const rdef = 15;
  let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;

  r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r;

  const h = Math.abs(ey - y) / 2 - r;
  const w = Math.abs(ex - x) - r * 2;
  // w=0;
  const path = `
      M ${x} ${y}
      L ${x} ${y + h * yrvs}
      C  ${x} ${y + h * yrvs + r * yrvs} ${x} ${y + h * yrvs + r * yrvs} ${x + r * xrvs} ${y + h * yrvs + r * yrvs}
      L ${x + w * xrvs + r * xrvs} ${y + h * yrvs + r * yrvs}
      C  ${ex}  ${y + h * yrvs + r * yrvs} ${ex}  ${y + h * yrvs + r * yrvs} ${ex} ${ey - h * yrvs}
      L ${ex} ${ey}
`;
  return path;
}

function hdiagonal(source: Point, target: Point) {
  const { x, y } = source;
  const { x: ex, y: ey } = target;

  // Values in case of top reversed and left reversed diagonals
  const xrvs = ex - x < 0 ? -1 : 1;
  const yrvs = ey - y < 0 ? -1 : 1;

  // Define preferred curve radius
  const rdef = 15;

  // Reduce curve radius, if source-target x space is smaller
  let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;

  // Further reduce curve radius, is y space is more small
  r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r;

  // Defin width and height of link, excluding radius
  const h = Math.abs(ey - y) / 2 - r;
  const w = Math.abs(ex - x) / 2 - r;

  // Build and return custom arc command
  return `
      M ${x} ${y}
      L ${x + w * xrvs} ${y}
      C ${x + w * xrvs + r * xrvs} ${y}
        ${x + w * xrvs + r * xrvs} ${y}
        ${x + w * xrvs + r * xrvs} ${y + r * yrvs}
      L ${x + w * xrvs + r * xrvs} ${ey - r * yrvs}
      C ${x + w * xrvs + r * xrvs}  ${ey}
        ${x + w * xrvs + r * xrvs}  ${ey}
        ${ex - w * xrvs}  ${ey}
      L ${ex} ${ey}
  `;
}

function customRectCorner(rectInfo: RectDef) {
  const {
    startx, starty, rectWidth, rectHeight, rounded, radius,
  } = rectInfo;
  let path;

  switch (rounded) {
    case 'left':
      path = `
      M${startx + radius},${starty + radius}
      a${radius},${radius} 0 0 1 ${radius},-${radius}
      h${rectWidth - radius}
      v${rectHeight}
      h${-rectWidth + radius}
      a${radius},${radius} 0 0 1 -${radius},-${radius}
      z
      `;
      break;
    case 'right':
      path = `
      M${startx},${starty}
      h${rectWidth - radius}
      a${radius},${radius} 0 0 1 ${radius},${radius}
      v${rectHeight - 2 * radius}
      a${radius},${radius} 0 0 1 ${-radius},${radius}
      h ${radius - rectWidth}
      z
      `;
      break;
    case 'top':
      path = `
      M${startx},${starty + radius}
      a${radius},${radius} 0 0 1 ${radius},-${radius}
      h${rectWidth - 2 * radius}
      a${radius},${radius} 0 0 1 ${radius},${radius}
      v${rectHeight - radius}
      h${-rectWidth}
      z`;
      break;
    case 'bottom':
      path = `
      M${startx},${starty}
      h${rectWidth}
      v${rectHeight - radius}
      a${radius},${radius} 0 0 1 ${-radius},${radius}
      h${-rectWidth + 2 * radius}
      a${radius},${radius} 0 0 1 -${radius},-${radius}
      z`;
      break;
    case 'all': // 936
      path = `
      M${startx},${starty + radius}
      a${radius},${radius} 0 0 1 ${radius},-${radius}
      h${rectWidth - 2 * radius}
      a${radius},${radius} 0 0 1 ${radius},${radius}
      v${rectHeight - 2 * radius}
      a${radius},${radius} 0 0 1 ${-radius},${radius}
      h${-rectWidth + 2 * radius}
      a${radius},${radius} 0 0 1 -${radius},-${radius}
      z`;
      break;
    default: {
      path = `
      M${startx}${starty}
      h${rectWidth}
      v${rectHeight}
      h${-rectWidth}
      v${-rectHeight}
      z
      `;
      break;
    }
  }

  return path;
}

function typeFeatureMapIcon(feature: string): string {
  switch (feature) {
    case edgeType.KeyOptional: return '?';
    case edgeType.TypeAggr: return '*';
    case edgeType.ValueMultipleType: return '+';
    default: return '';
  }
}

function AincludeB(A: Array<any>, B: Array<any>): boolean {
  return B.every((val: any) => A.includes(val));
}

// assign id to each node in the tree
export function dataProcessWithId(originalData: TypeNode): Array<TypeNode> {
  // need further update
  function customAccessChildren({ children }: { children: any, type: any }) {
    if (children.every((ele: any) => ele == null)) return null;
    return children.filter((ele: any) => ele !== null);
  }
  return d3.hierarchy(originalData, customAccessChildren)
    .descendants()
    .map((d, i) => Object.assign(d, { id: i }))
    .map((d) => Object.assign(d.data, {
      id: d.id,
      parentId: d.parent && d.parent.id,
    }));
}

export function nodeDrawData(dataWithId: Array<TypeNode>, orient: 'h' | 'v') {
  // assign max proportion to each level of chilren
  dataWithId.forEach((data: TypeNode) => {
    if (data.parentId == null) { // 根节点直接赋值
      Object.assign(data, { currentLevelMaxFreq: 1 });
    }

    let childrenMaxFreq = -1;
    data.children.forEach((cd: TypeNode | null) => {
      if (cd == null) return;
      childrenMaxFreq = Math.max(
        cd.typeProportion.reduce((a, b) => a + b, 0),
        childrenMaxFreq,
      );
    });
    data.children.forEach((cd: TypeNode | null) => {
      if (cd == null) return;
      Object.assign(cd, { currentLevelMaxFreq: childrenMaxFreq });
    });
  });
  return dataWithId.map((data: TypeNode) => {
    const nodeFillColor = data.type.map(
      (t: string) => typeMapColor[t as keyof typeof typeMapColor],
    );

    const maxFreq = data.currentLevelMaxFreq;
    // 当前层的最大频率如何获取
    const heightRaitio = typeNodeStyle.nodeHeight / maxFreq;
    const sz = data.typeProportion.length;

    let prevStart = 0;
    const typeMapStartShift = new Map();
    const nodeMultipleRectInfo = nodeFillColor.map((color: string, i: number) => {
      const rectHeight = data.typeProportion[i] * heightRaitio;
      const currentStart = prevStart;
      prevStart += rectHeight;
      let rounded;
      if (i === 0 && i === sz - 1) rounded = 'all';
      else if (i === 0 && i !== sz - 1) rounded = orient === 'h' ? 'top' : 'left';
      else if (i !== 0 && i === sz - 1) rounded = orient === 'h' ? 'bottom' : 'right';
      else rounded = 'no';

      const shiftFromStartCenter = (currentStart + rectHeight / 2) - typeNodeStyle.nodeHeight / 2;
      // 当前rect的中心减去原本的中心 就是当前rect的位移，用于后续link计算偏移
      const currentType = data.type[i];
      typeMapStartShift.set(currentType, shiftFromStartCenter);

      return {
        rectColor: color,
        rectHeight,
        rectWidth: typeNodeStyle.nodeWidth,
        starty: currentStart,
        startx: 0,
        radius: typeNodeStyle.nodeBorderRadius,
        rounded,
      };
    });

    // 记录当前节点整体的高度，用于from - to link的终点
    const currentNodeAllHeight = prevStart;
    const shiftFromEndCenter = (currentNodeAllHeight - typeNodeStyle.nodeHeight) / 2;

    return {
      nodeId: data.id,
      parentNodeId: data.parentId,
      parentType: data.parentType,
      nodeWidth: typeNodeStyle.nodeWidth,
      nodeHeight: typeNodeStyle.nodeHeight,
      nodeCircleRadius: typeNodeStyle.nodeCircleRadius,
      nodeBorderRadius: typeNodeStyle.nodeBorderRadius,
      nodeMultipleRectInfo,
      shiftFromEndCenter,
      shiftFromStartCenter: typeMapStartShift,
      connectorLineColor: typeNodeStyle.connectorLineColor,
      connectorLineWidth: typeNodeStyle.connectorLineWidth,
      dataType: data.type,
      nodeFillColor,
      dataTypeFeature: data.typeFeature,
      dataTypeText: data.typeValue,
      dataTypeTextTruncated: data.typeValue
        && fittingString(data.typeValue, typeNodeStyle.nodeWidth, nodeTextStyle.fontSize),
    };
  });
}

export class TreeChart {
  svgWidth: number;
  svgHeight: number;
  margins: Array<number>;
  container: string;
  data: any;
  zoomLevel: number;
  depth: number;
  calculated: KV; // SVG画布相关的信息，如宽高、边距、对称中心
  treeLayout: any; // 用于存放layout配置
  realChart: any;
  previousTransform: any;
  centerG: any;
  centerX: number;
  root: any; // 树的根节点及其children
  allNodes: any; // 用于存放root数据输入layout配置中后生成的位置信息
  defaultFont: string;
  duration: number;
  store: TableStore;
  orient: 'h' | 'v';

  constructor(
    _margins: Array<number>,
    _container: string,
    _data: any,
    _store: any,
    _zoomLevel = 1.0,
    _orient: 'h' | 'v' = 'h' as const,
  ) {
    this.svgWidth = 500;
    this.svgHeight = 500;
    this.margins = _margins;
    this.container = _container;
    this.zoomLevel = _zoomLevel;
    this.orient = _orient;
    this.depth = 10;
    this.calculated = {};
    this.treeLayout = null;
    this.realChart = null;
    this.previousTransform = null;
    this.centerX = 0;
    this.root = null;
    this.allNodes = null;
    this.defaultFont = 'Helevtica';
    this.duration = 600;
    this.data = _data;
    this.store = _store;

    this.zoomed.bind(this);
    this.setZoomFactor.bind(this);
    this.batchEnterExitUpdate();
  }

  // 需要再展开收起节点后自适应当前容器
  public setZoomFactor() {
    const currentWidth = this.centerG.node()
      .getBoundingClientRect().width;
    let targetZoomLevel = this.svgWidth / currentWidth;
    targetZoomLevel = targetZoomLevel > 1 ? 1 : targetZoomLevel;
    this.zoomLevel = targetZoomLevel;

    if (this.orient === 'h') {
      this.centerG.attr('transform', `translate(${this.calculated.nodeMaxWidth / 2}, ${this.calculated.centerY}) scale(${targetZoomLevel})`);
    } else {
      this.centerG.attr('transform', `translate(${this.calculated.centerX}, ${this.calculated.nodeMaxHeight / 2}) scale(${targetZoomLevel})`);
    }
  }

  private zoomed(e: any) {
    this.previousTransform = e.transform;
    this.realChart.attr('transform', e.transform);
  }

  /*
  private handleCircleClick(_: any, d: any) {
    if (d.children) {
      d.hiddenChildren = d.children;
      d.children = null;
    } else {
      if (d.hiddenChildren) d.children = d.hiddenChildren;
      d.hiddenChildren = null;
    }

    this.update(d);
  }

  private handleRectClick(
    _: any,
    parent: any,
    childrenToToggle: Array<any>,
  ) {
    // childrenToToggle 全部出现在children中，说明当前点击是期望收起
    if (parent.children && AincludeB(parent.children, childrenToToggle)) {
      if (!parent.hiddenChildren) {
        parent.hiddenChildren = [];
      }
      parent.hiddenChildren = parent.hiddenChildren.concat(childrenToToggle);
      parent.children = parent.children.filter((cd) => !childrenToToggle.includes(cd));
      // 如果传入空数组，d3 tree.js会报错 read properties of undefined (reading 'z') at firstWalk
      // 没有children只能传null
      if (!parent.children.length) {
        parent.children = null;
      }
    } else if (parent.hiddenChildren && AincludeB(parent.hiddenChildren, childrenToToggle)) {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children = parent.children.concat(childrenToToggle);
      parent.hiddenChildren = parent.hiddenChildren.filter((cd) => !childrenToToggle.includes(cd));
      if (!parent.hiddenChildren.length) parent.hiddenChildren = null;
    }

    this.update(parent);
  }
    */

  private declareContextMenu(event: any, node: any) {
    event.preventDefault();
    // event.stopPropagation();
    // console.log(event, node);
    /*
    if (!this.store.state.selectedNode.length) {
      event.stopPropagation();
      return; // 什么都没有选中不显示菜单
    }
    this.store.commit('setContextMenuVisibility', true);
    */
    if (node.parent === null) {
      this.store.tree.menuList = [this.store.tree.menuAllList[3]];
    } else {
      this.store.tree.menuList = this.store.tree.menuAllList
    }
    // console.log("node", node);
    this.store.spec.selectNode = node;
    this.store.tree.contextMenuVisible = true;
  }


  private batchEnterExitUpdate() {
    d3.selection.prototype.patternify = function (selectedTag:
      { tag: string, selector: string, targetData?: any }) {
      const { tag, selector } = selectedTag;
      const tmpData = selectedTag.targetData || [selector];
      const batchSelection = this.selectAll(`.${selector}`)
        .data(tmpData, (d: any, i: any) => {
          if (typeof d === 'object') {
            if (d.id) {
              return d.id;
            }
          }
          return i;
        });

      batchSelection.exit()
        .remove();
      const mergedSelection = batchSelection.enter()
        .append(tag)
        .merge(batchSelection);
      mergedSelection.attr('class', selector);
      return mergedSelection;
    };
  }
  /*
    const { size } = completeSpecification({ size: d.data.size });
            d.data.size = size;
            const parent: TableTidierTemplate = d.parent!.data;
            let parentX = 0, parentY = 0;
            if (parent.hasOwnProperty('startCell')) {
              parentX = parent.startCell!.xOffset as number;
              parentY = parent.startCell!.yOffset as number;
            } else {
              // console.log("parent", parent, d);
            }
            if (size.height === 'toParentY') {
              d.data.size.height = (parent.size!.height as number) - parentY;
            }
            if (d.data.size.width === 'toParentX') {
              d.data.size.width = (parent.size!.width as number) - parentX;
            }*/

  private addPathToNodes(nodes: NodeData[], parentPath: number[] = []) {
    if (!nodes) return;
    nodes.forEach((node, index) => {
      // 构建当前节点的 path
      const currentPath = [...parentPath, index];
      node.path = currentPath;
      // node.id = currentPath.join('-');
      /*
      const { size } = completeSpecification({ size: node.data.size });
      const parent = node.parent!.data;
      let parentX = 0, parentY = 0;
      node.data.width = size.width;
      node.data.height = size.height;
      if (parent.hasOwnProperty('startCell')) {
        parentX = parent.startCell!.xOffset as number;
        parentY = parent.startCell!.yOffset as number;
      }
      if (size.height === 'toParentY') {
        node.data.height = parent.height! - parentY;
      }
      if (size.width === 'toParentX') {
        node.data.width = parent.width! - parentX;
      }
      */
      // 如果当前节点有子节点，递归处理子节点
      this.addPathToNodes(node.children, currentPath);
    });
  }

  public render() {
    // 获取当前svg所在容器，使svg长度高度匹配容器
    const drawingContainer = d3.select(this.container);
    // 清空当前容器下的所有子元素
    (drawingContainer.node() as HTMLElement).replaceChildren();

    const drawingContainerBoundry = (drawingContainer.node() as HTMLElement)
      .getBoundingClientRect();
    if (drawingContainerBoundry.width > 0) {
      this.svgWidth = drawingContainerBoundry.width;
      this.svgHeight = drawingContainerBoundry.height;
    }


    const nodeMaxWidth = typeNodeStyle.nodeWidth; // d3.max(this.data, (({ nodeWidth }) => nodeWidth));
    const nodeMaxHeight = typeNodeStyle.nodeHeight; // d3.max(this.data, (({ nodeHeight }) => nodeHeight));
    this.calculated = {
      id: `ID${Math.floor(Math.random() * 1000000)}`,
      chartVerticalMargin: this.margins[0],
      chartHorizontalMargin: this.margins[1],
      chartWidth: this.svgWidth - this.margins[0] * 2,
      chartHeight: this.svgHeight - this.margins[1] * 2,
      nodeMaxWidth,
      nodeMaxHeight,
      centerX: (this.svgWidth - this.margins[0] * 2) / 2,
      centerY: (this.svgHeight - this.margins[1] * 2) / 2,
    };

    this.depth = this.orient === 'h' ? nodeMaxWidth / 2 : nodeMaxHeight + 20;

    this.treeLayout = d3.tree()
      .size([this.calculated.chartWidth, this.calculated.chartHeight]);
    // console.log("layout:", this.treeLayout);
    // console.log(this.calculated);


    if (this.orient === 'h') {
      this.treeLayout.nodeSize([this.calculated.nodeMaxHeight + typeNodeStyle.nodeSpacing,
      this.calculated.nodeMaxWidth + this.depth]);
    } else {
      this.treeLayout.nodeSize([this.calculated.nodeMaxWidth + typeNodeStyle.nodeSpacing,
      this.calculated.nodeMaxHeight + this.depth]);
    }

    if (Array.isArray(this.data)) {
      this.root = d3.stratify()
        .id((d: any) => d.nodeId)
        .parentId((d: any) => d.parentNodeId)(this.data);
    } else {
      this.root = d3.hierarchy(this.data, (d: any) => d.children);
      // 初始化 id 计数器
      let idCounter = 0;
      // 为每个节点分配唯一的 id
      this.root.each((node: any) => {
        node.id = idCounter++;
        const spec: VisTreeNode = node.data;
        if (spec.transform === undefined || spec.transform === null) {
          node.type = "null";
        } else {
          if (Array.isArray(spec.transform.targetCols)) {
            node.type = "position";
          } else if (spec.transform.targetCols === 'context') {
            node.type = "context";
          } else {
            node.type = "value";
          }
        }
      });



      this.root.path = [];
      // this.root.id = "root";
      this.addPathToNodes(this.root.children);
    }

    this.root.x0 = 0;
    this.root.y0 = 0;

    /*
    this.allNodes = this.treeLayout(this.root)
      .descendants()
      .forEach((d: any) => {
        Object.assign(d.data, {
          directSubordinates: d.children ? d.children.length : 0, // 计算直接下属的数量（即直接子节点的数量）
          totalSubordinates: d.descendants().length - 1,  // 计算总下属的数量（包括所有子孙节点，但不包括自身）
        });
      });
    */

    // pan & zoom handler
    const zoomfunc: any = (d3.zoom() as any).on('zoom', this.zoomed.bind(this))
      .bind(this);

    // svg画布
    // @ts-ignore
    const svg = drawingContainer.patternify({ tag: 'svg', selector: 'svg-chart-container' })
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight)
      .attr('font-family', this.defaultFont)
      // .attr('cursor', 'move')
      // .attr('viewBox', `${this.margins[0]} ${this.margins[1]} ${this.svgWidth} ${this.svgHeight}`)
      // .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"))
      .call(zoomfunc.bind(this)).on('dblclick.zoom', null)  // 禁用双击缩放

    // svg画布与容器边距 
    const chart = svg.patternify({ tag: 'g', selector: 'chart' })
      .attr('transform', `translate(${this.calculated.chartHorizontalMargin}, ${this.calculated.chartVerticalMargin})`);
    this.realChart = chart;

    // 真正放置node link
    const centerG = chart.patternify({ tag: 'g', selector: 'center-group' })
    // .attr('transform', this.orient === 'h' ? `translate(${this.calculated.chartHorizontalMargin}, ${this.calculated.centerY}) scale(${this.zoomLevel})` : `translate(${this.calculated.centerX}, ${this.calculated.nodeMaxHeight / 2}) scale(${this.zoomLevel})`);
    this.centerG = centerG;

    // 开始画图例

    // 开始画node link
    this.update(this.root);
    return this;
  }

  private update(data: any) {
    const treeData = this.treeLayout(this.root);
    const linksData = treeData.descendants()
      .slice(1);
    const nodesData = treeData.descendants();
    if (this.orient === 'h') {
      nodesData.forEach((d: any, index: number) => {
        const originalX = d.x;
        d.x = d.y;
        d.y = originalX;
        if (index === 0) {
          d.x = typeNodeStyle.nodeCircleRadius * 2;
        }
      });
    }
    // 如果是水平视图，要等nodesData转变过后再解构，否则得到的是转变之前的位置，造成transition bug
    const {
      x0, y0, x, y,
    } = data;

    // ************************************绘制link************************************
    const linksSelection = this.centerG.selectAll('path.link')
      .data(linksData, (d: any) => d.id);

    const linkGen = d3.linkHorizontal();

    const linksEnter = linksSelection.enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const o: d3.DefaultLinkObject = {
          source: [x0, y0],
          target: [x0, y0],
        };
        return linkGen(o);
      });

    const linkUpdate = linksEnter.merge(linksSelection);

    linkUpdate.attr('fill', 'none')
      .attr('stroke-width', typeNodeStyle.connectorLineWidth)
      .attr('stroke', typeNodeStyle.connectorLineColor)
    // .attr('stroke-width', ((d: any) => d.data.connectorLineWidth || 2))
    // .attr('stroke', (d: any) => (d.data.connectorLineColor ? d.data.connectorLineColor : 'black'));

    let realChartWidth = 0
    linkUpdate.transition()
      .duration(this.duration)
      .attr('d', (d: any) => {
        if (this.orient === 'h') {
          let xshiftStart = typeNodeStyle.nodeWidth / 2;
          const yshiftStart = 0;
          const xshiftEnd = -typeNodeStyle.nodeWidth / 2;
          const yshiftEnd = 0;

          if (d.parent.id == "0") {
            xshiftStart = typeNodeStyle.nodeCircleRadius
          }

          const chartWidth = d.x + xshiftStart;
          if (chartWidth > realChartWidth) {
            realChartWidth = chartWidth;
          }

          const o: d3.DefaultLinkObject = {
            source: [d.parent.x + xshiftStart, d.parent.y + yshiftStart],
            target: [d.x + xshiftEnd, d.y + yshiftEnd],
          };
          return linkGen(o);
        }

        const o: d3.DefaultLinkObject = {
          source: [d.parent.x, d.parent.y + typeNodeStyle.nodeHeight / 2],
          target: [d.x, d.y - typeNodeStyle.nodeHeight / 2],
        };
        return linkGen(o);
        return diagonal({ x: d.x, y: d.y }, { x: d.parent.x, y: d.parent.y });
      });



    // 用于节点收缩或展开是动效终点所处位置
    const linkExit = linksSelection.exit()
      .transition()
      .duration(this.duration)
      .attr('d', () => {
        const o: d3.DefaultLinkObject = {
          source: [x, y],
          target: [x, y],
        };
        return linkGen(o);
      })
      .remove();

    // ************************************绘制node************************************
    const nodesSelection = this.centerG.selectAll('g.node')
      .data(nodesData, (d: any) => d.id);



    const nodeEnter = nodesSelection.enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', () => `translate(${x0}, ${y0})`)
      .attr('cursor', 'pointer');



    // ************************************节点、节点文本、节点上方边文本****************************
    const nodeGroups = nodeEnter.patternify({ tag: 'g', selector: 'node-group', targetData: (d: any) => [d] });
    // const nodeRectText = nodeEnter.patternify({ tag: 'text', selector: 'node-text', targetData: (d: any) => [d] });

    // const nodeRectText = nodeGroups.patternify({ tag: 'g', selector: 'node-text-g', targetData: (d: any) => [d] });
    // nodeRectText.patternify({ tag: 'text', selector: 'node-text' });
    // nodeRectText.patternify({ tag: 'svg:title', selector: 'node-tooltip' });

    // const edgeText = nodeEnter.patternify({ tag: 'text', selector: 'edge-text', targetData: (d: any) => [d] });

    const nodeUpdate = nodeEnter.merge(nodesSelection);

    nodeUpdate.transition()
      .attr('opaicty', 0)
      .duration(this.duration)
      .attr('transform', (d: any) => {
        // console.log(d);
        return `translate(${d.x}, ${d.y})`
      })
      .attr('opacity', 1);

    // console.log(data);

    // 绑定选中节点的交互
    // nodeGroups
    //   // .on('click', this.handleNodeMultipleSelect.bind(this))
    //   .on('contextmenu', this.declareContextMenu.bind(this));

    // nodeGroups.attr('transform', ({ data: info }: any) => `translate(${-info.nodeWidth / 2}, ${-info.nodeHeight / 2})`);
    nodeGroups.attr('transform', () => `translate(${-typeNodeStyle.nodeWidth / 2}, ${-typeNodeStyle.nodeHeight / 2})`);

    nodeGroups.each(function (this: any, dataBindToThis: any) {
      const current = d3.select(this);
      if (dataBindToThis.parent === null) { // 提前处理圆形节点，array下的元素
        // @ts-ignore
        current.patternify({ tag: 'circle', selector: `node-circle-${dataBindToThis.id}` });
        nodeGroups.select(`.node-circle-${dataBindToThis.id}`)
          .attr('class', `node-circle-${dataBindToThis.id} type-node`)
          .attr('r', typeNodeStyle.nodeCircleRadius)
          .attr('fill', ({ type }: { type: TransformTypes }) => typeMapColor[type])
          .attr('transform', `translate(${typeNodeStyle.nodeWidth / 2}, ${typeNodeStyle.nodeHeight / 2})`)
          // .attr('cursor', (d: any) => (!d.children && !d.hiddenChildren ? 'none' : 'pointer'))
          .attr('cursor', 'pointer')
        // .attr('pointer-events', (d: any) => (!d.children && !d.hiddenChildren ? 'none' : 'all'));
        return;
      }

      const nodeRectData = {
        // "rectColor": typeNodeStyle.nodeRectFillColor,
        "rectHeight": typeNodeStyle.nodeHeight,
        "rectWidth": typeNodeStyle.nodeWidth,
        "starty": 0,
        "startx": 0,
        "radius": 5,
        "rounded": "all"
      }
      // @ts-ignore
      current.patternify({ tag: 'path', selector: `multi-type-rect-${dataBindToThis.id}` });
      nodeGroups.select(`.multi-type-rect-${dataBindToThis.id}`)
        .attr('class', `multi-type-rect-${dataBindToThis.id} type-node`)
        .attr('d', customRectCorner(nodeRectData as RectDef))
        .attr('fill', ({ type }: { type: TransformTypes }) => typeMapColor[type])
        // .attr('fill', nodeRectData.rectColor)
        // .attr('cursor', (d: any) => (!d.children && !d.hiddenChildren ? 'none' : 'pointer'))
        .attr('cursor', 'pointer')
      // .attr('pointer-events', (d: any) => (!d.children && !d.hiddenChildren ? 'none' : 'all'));
    });

    const nodeRectText = nodeUpdate.patternify({ tag: 'g', selector: 'node-text-g', targetData: (d: any) => [d] });
    nodeRectText.patternify({ tag: 'text', selector: 'node-text' });
    nodeRectText.patternify({ tag: 'svg:title', selector: 'node-tooltip' });

    nodeRectText.select('.node-text')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', nodeTextStyle.color)
      .attr('font-size', nodeTextStyle.fontSize)
      // .attr('y', ({ data: info }: any) => nodeTextStyle.yAxisAdjust + info.shiftFromEndCenter)
      .attr('y', () => nodeTextStyle.yAxisAdjust)
      .attr('cursor', 'pinter')
      .attr('pointer-events', 'auto')  // .style('pointer-events', 'none');
      .text((d: NodeData) => {
        if (d.id === 0) {
          // console.log(d.data.size);
          return "0";
        } else {
          let width: number | null = d.data.width!;
          let height: number | null = d.data.height!;
          if (d.data.size !== undefined) {
            if (d.data.size.width === null) width = null;
            if (d.data.size.height === null) height = null;
          }
          return `(${width}, ${height})`;
        }
      })
    // .on('click', (event: any, d: any) => {
    //   // 阻止点击事件的默认行为和传播
    //   // event.stopPropagation();
    //   // event.preventDefault();
    //   console.log("click", d);
    // })
    // .append("svg:title").text("(d: any) => d.data.id");

    nodeRectText.select('.node-tooltip')
      // .filter(({ data: info }: any) => info.dataTypeText !== info.dataTypeTextTruncated)
      .text((d: NodeData) => "Path: " + JSON.stringify(d.path));


    // 为所有circle和rect绑定展开收起交互事件
    d3.selectAll('.type-node, .node-text-g')
      .on('contextmenu', this.declareContextMenu.bind(this))
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        // console.log(event, d);
        // [startRow, startCol, endRow, endCol]
        const visData = d.data as VisTreeNode;
        const matchSelected: Array<[number, number, number, number]> = [];
        visData.matchs?.forEach((match) => {
          const { x, y, width, height } = match;
          matchSelected.push([y, x, y + height - 1, x + width - 1]);
        })
        let allHightedInCells: TblCell[] = [];
        let allHightedOutCells: TblCell[] = [];
        let allHightedMiniCells: TblCell[] = [];
        if (matchSelected.length > 0) {
          const { selectedCoords, hightedCells } = this.store.getHightlightedCells(matchSelected, "posi-mapping-shallow");
          allHightedInCells = allHightedInCells.concat(hightedCells);
          const cells = this.store.in_out_mapping(selectedCoords, "input_tbl", "posi-mapping-shallow");
          allHightedOutCells = allHightedOutCells.concat(cells);
          allHightedMiniCells = allHightedMiniCells.concat(hightedCells);
        }

        const selected: Array<[number, number, number, number]> = [[visData.y, visData.x, visData.y + visData.height - 1, visData.x + visData.width - 1]];
        const { selectedCoords, hightedCells } = this.store.getHightlightedCells(selected);
        allHightedInCells = allHightedInCells.concat(hightedCells);
        this.store.highlightTblCells("input_tbl", allHightedInCells, Object.values(selectedCoords)[0]);
        const cells = this.store.in_out_mapping(selectedCoords, "input_tbl");
        allHightedOutCells = allHightedOutCells.concat(cells);
        this.store.highlightTblCells("output_tbl", allHightedOutCells);
        allHightedMiniCells = allHightedMiniCells.concat(hightedCells);
        this.store.highlightMinimapCells(allHightedMiniCells);

        return;
        // this.handleCircleClick(event, d);  // 收缩节点
      });


    /*
    nodeUpdate.select('.edge-text')
      .attr('fill', edgeTextStyle.color)
      .attr('font-size', edgeTextStyle.fontSize)
      .text(({ data: info }: any) => typeFeatureMapIcon(info.dataTypeFeature))
      .attr('x', ({ data: info }: any) => {
        if (this.orient === 'h') {
          return (info.dataTypeText ? -info.nodeWidth / 2 : -info.nodeCircleRadius) - 15;
        }
        return edgeTextStyle.distFromEdge;
      })
      .attr('y', ({ data: info }: any) => (this.orient === 'h' ? -edgeTextStyle.distFromEdge + info.shiftFromEndCenter : -info.nodeHeight / 2 - 2));
    */
    // ************************************exit 节点************************************
    const nodeExitTransition = nodesSelection.exit()
      .attr('opacity', 1)
      .transition()
      .duration(this.duration)
      .attr('transform', `translate(${x},${y})`)
      .on('end', function (this: any) {
        d3.select(this)
          .remove();
      })
      .attr('opacity', 0);

    // Store the old positions for transition.
    nodesData.forEach((d: any) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    const offsetX = Math.max((this.svgWidth - realChartWidth) / 2, 0) - typeNodeStyle.nodeCircleRadius * 2;
    const offsetY = Math.max((this.svgHeight - this.realChart.node()!.getBBox().height) / 2, 0);
    this.centerG.attr('transform', `translate(${offsetX}, ${offsetY})`); // Center the matrix
  }
}
