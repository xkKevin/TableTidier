export interface ChatMessage {
    role: string
    content: string
}

// The Declarative Grammar v0.2

/**
 * PositionFn: (pi: Position2D, areaCells: AreaCellInfo[])
 * For startCell and endCell:
 *   pi is the instance index that matches this template (pi.row means traverse in the row direction, pi.col means traverse in the col direction)
 *   areaCells contains all the selected cells of parent template area
 * For context:
 *   pi is the cell index position of this template area
 *   areaCells contains all the selected cells of this template area
 */
type PositionFn = (pi: Position2D, areaCells: AreaCellInfo[]) => Position

/**
 * Set rules for value, if return false, means the value does not meet the rule
 */
type CheckValueFn = (value: string) => boolean

/**
 * Derive the target variable based on the selected/context cells
 * vi: the cell index of this template area
 * areaCells: all selected cells of this template area
 * contextCells: the context cells corresponding to the selected cells of this template area (Note that there may be multiple context cells for each selected cell, so contextCells is a 2D array)
 */
type DeriveTargetFn = (vi: number, areaCells: AreaCellInfo[], contextCells: AreaCellInfo[][]) => string | string[]

interface Position {
    // If null, means no rule for row/col
    row?: number | null,
    col?: number | null
}

interface Position2D {
    row: number
    col: number
}

/**
 * For startCell and endCell:
 * if position is not null, means involving position-based selection
 * if value is not null, means involving value-based selection
 */
type CellInfo = {
    position: Position | PositionFn,
    value?: CheckValueFn | string // | number | null
}

type AreaCellInfo = {
    position: Position2D,
    value: string // string | number | null
}

export interface TableTidierMapping {
    startCell?: CellInfo,
    endCell?: CellInfo,
    // if context is not null, means involving value-based selection
    context?: CellInfo[],
    subMapping?: TableTidierMapping[],
    // if target is string or string[], means position-based mapping;
    // if target is function, means value-based or context-based mapping;
    target?: string | string[] | DeriveTargetFn
}

// The Declarative Grammar v0.3

interface AreaInfo {
    parent: AreaInfo | null, // 该区域的父区域
    areaLayer: number,       // 该区域在root区域下的层级
    templateIndex: number,   // 该区域属于父区域定义下的第几个模板
    xIndex: number,          // 该区域在父区域x轴方向上是第几个符合该模板的区域
    yIndex: number,          // 该区域在父区域y轴方向上是第几个符合该模板的区域
    xOffset: number,         // 该区域在父区域x轴方向上的偏移量
    yOffset: number,         // 该区域在父区域y轴方向上的偏移量
    x: number,               // 该区域在整个表格x轴方向上的坐标
    y: number,               // 该区域在整个表格y轴方向上的坐标
    width: number,           // 该区域的宽度
    height: number,          // 该区域的高度
    areaCells: AreaCell[],   // 该区域的所有单元格
    children: AreaInfo[]     // 该区域的子区域
}

interface AreaCell {
    xOffset: number,   // 该单元格在所在区域x轴方向上的偏移量
    yOffset: number,   // 该单元格在所在区域y轴方向上的偏移量
    value: cellValueType      // 该单元格的值
}

interface CellMapCol extends AreaCell {
    targetCol: string | null
}

type cellValueType = string | number
export enum ValueType {
    String,
    Number,
    None
}
type offsetFn = (currentAreaInfo: AreaInfo, rootAreaInfo: AreaInfo) => number
type checkValueFn = (value: cellValueType) => boolean
type mapColsFn = (currentAreaCells: AreaCell[]) => (string | null)[]
type mapColbyContextFn = (contextValue: cellValueType) => string | null
type contextPosiFn = (currentAreaInfo: AreaInfo, rootAreaInfo: AreaInfo) => CellSelection[]
type areaLayerFn = (currentAreaInfo: AreaInfo) => number

interface CellSelection {
    referenceAreaLayer?: 'current' | 'parent' | 'root' | areaLayerFn,  // 选定区域时参考区域的层级，默认为current
    referenceAreaPosi?: 'topLeft' | 'bottomLeft' | 'topRight' | 'bottomRight',  // 选定区域时参考区域的位置，默认为topLeft
    xOffset?: number | offsetFn,  // 选定区域时相对参考区域x轴方向上的偏移量，默认为0
    yOffset?: number | offsetFn   // 选定区域时相对参考区域y轴方向上的偏移量，默认为0
}

interface CellConstraint extends CellSelection {
    // cellValueType表示该单元格的值必须为某指定值；'string' | 'number'表示该单元格的值必须为字符串或数字；checkValueFn表示该单元格的值必须满足的自定义条件
    valueCstr: cellValueType | ValueType | checkValueFn
}

/**
 * position: 表示指定位置的单元格作为该单元格的 context cell
 * targetCol: 表示如何根据context cell得到该单元格对应的target column。其中：'cellValue' 表示使用该context cell的值作为target column，如果该context cell的值为空，则target column为null，此单元格不会被转换到output table中；mapColbyContextFn表示按照自定义规则根据context value匹配到指定target column。如果返回null，此单元格不会被映射到output table中。
 */
interface ContextTransform {
    // 
    position: 'top' | 'bottom' | 'left' | 'right' | contextPosiFn,
    targetCol: 'cellValue' | mapColbyContextFn
}

export interface TableTidierTemplate {
    startCell: CellSelection,
    size?: {
        width?: number | 'toParentX' | undefined,  // 选择区域的宽度，'toParentX' 表示从startCell到父区域的x轴终点的距离， undefined 表示不限制宽度；默认为1
        height?: number | 'toParentY' | undefined  // 选择区域的高度，'toParentY' 表示从startCell到父区域的y轴终点的距离， undefined 表示不限制高度；默认为1
    },
    constraints?: CellConstraint[],
    traverse?: {
        xDirection?: 'none' | 'after' | 'before' | 'whole';  // 遍历区域时x轴方向上的遍历顺序，after表示从startCell向后方向遍历，before表示从startCell向前方向遍历，whole表示遍历整个区域，默认为 none，表示不遍历
        yDirection?: 'none' | 'after' | 'before' | 'whole';  // 遍历区域时y轴方向上的遍历顺序，after表示从startCell向后方向遍历，before表示从startCell向前方向遍历，whole表示遍历整个区域，默认为 none，表示不遍历
    },
    transform?: {
        context?: ContextTransform,
        // string[] 表示该区域的所有单元格按照索引位置匹配到该数组对应的列内；'context' 表示该区域的所有单元格按照context cell返回值匹配到对应的列内;mapColsFn表示该区域的所有单元格按照自定义规则匹配到该函数返回的列内
        targetCols: (string | null)[] | 'context' | mapColsFn
    },
    children?: TableTidierTemplate[]
}

const defaultTemplate: TableTidierTemplate = {
    startCell: {
        referenceAreaLayer: 'current',
        referenceAreaPosi: 'topLeft',
        xOffset: 0,
        yOffset: 0
    },
    size: {
        width: 1,
        height: 1
    },
    constraints: [],
    traverse: {
        xDirection: 'none',
        yDirection: 'none'
    },
    transform: undefined,
    children: []
}


type Pair = { value: number, originalIndex: number, correspondingValue: string };

export function sortWithCorrespondingArray(A: any[], B: string[], sortOrder: 'asc' | 'desc'): string[] {
    // Create a combined array of objects
    let combined: Pair[] = A.map((value, index) => ({
        value: value,
        originalIndex: index,
        correspondingValue: B[index]
    }));

    // Sort the combined array based on the value in the specified order
    combined.sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.value - b.value;
        } else {
            return b.value - a.value;
        }
    });

    // Extract the sorted corresponding values based on the original indices
    let sortedB: string[] = new Array(B.length);
    combined.forEach((pair, index) => {
        sortedB[pair.originalIndex] = pair.correspondingValue;
    });

    return sortedB;
}



// interface aa {
//     a: string,
//     b: number
// }

// // type bb = aa & {c: 12 | 22}
// interface bb extends aa {
//     c: 12 | 22
// }


// let xy: bb = {
//     a: '12',
//     b: 1,
//     c: 22
// }