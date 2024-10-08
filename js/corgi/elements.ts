import { AnyBoundController, UnboundEvents } from './binder';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      a: AnchorProperties;
      article: Properties;
      aside: Properties;
      button: ButtonProperties;
      canvas: Properties;
      code: Properties;
      circle: CircleProperties;
      details: Properties;
      div: Properties;
      form: Properties;
      footer: Properties;
      g: GroupProperties;
      h1: Properties;
      h2: Properties;
      h3: Properties;
      h4: Properties;
      h5: Properties;
      h6: Properties;
      hr: Properties;
      header: Properties;
      i: Properties;
      img: ImageProperties;
      input: InputProperties;
      label: Properties;
      li: Properties;
      line: LineProperties;
      main: Properties;
      nav: Properties;
      option: OptionProperties;
      p: Properties;
      path: PathProperties;
      polyline: PolylineProperties;
      pre: Properties;
      section: Properties;
      select: Properties;
      span: Properties;
      summary: Properties;
      svg: SVGProperties;
      table: Properties;
      tbody: Properties;
      td: TdProperties;
      text: TextProperties;
      textarea: TextAreaProperties;
      th: Properties;
      thead: Properties;
      time: Properties;
      tr: Properties;
      ul: Properties;
    }
  }
}

export interface Properties {
  ariaLabel?: string;
  autofocus?: boolean;
  children?: unknown[],
  className?: string;
  data?: {[key: string]: boolean|number|string};
  js?: AnyBoundController;
  style?: string; // TODO(april): this is sad
  tabindex?: string;
  title?: string;
  unboundEvents?: UnboundEvents;
}

export interface AnchorProperties extends Properties {
  href?: string;
  target?: '_self'|'_blank'|'_parent'|'_top';
}

export interface ButtonProperties extends Properties {
  type?: 'submit';
}

export interface GroupProperties extends Properties {}

export interface ImageProperties extends Properties {
  alt?: string;
  height?: string;
  src?: string;
  width?: string;
}

export interface InputProperties extends Properties {
  checked?: boolean;
  name?: string;
  placeholder?: string;
  size?: number;
  type?: 'checkbox'|'password'|'radio'|'text';
  value?: string;
}

export interface OptionProperties extends Properties {
  selected?: boolean;
  value?: string;
}

export interface TdProperties extends Properties {
  colspan?: string;
}

export interface TextAreaProperties extends Properties {
  name?: string;
  placeholder?: string;
  value?: string;
}

export interface SVGGraphicsProperties extends Properties {
  vectorEffect?: 'none'|'non-scaling-stroke'|'non-scaling-size'|'non-rotation'|'fixed-position';
}

export interface CircleProperties extends SVGGraphicsProperties, Properties {
  fill?: string;
  stroke?: string;
  strokeWidth?: number|string;
  cx: number|string;
  cy: number|string;
  r: number|string;
}

export interface LineProperties extends SVGGraphicsProperties, Properties {
  stroke?: string;
  strokeLinejoin?: 'arcs'|'bevel'|'miter'|'miter-clip'|'round';
  strokeWidth?: number|string;
  x1: number|string;
  y1: number|string;
  x2: number|string;
  y2: number|string;
}

export interface PathProperties extends SVGGraphicsProperties, Properties {
  d: string;
  fill?: string;
  stroke?: string;
  strokeLinejoin?: 'arcs'|'bevel'|'miter'|'miter-clip'|'round';
  strokeWidth?: number|string;
}

export interface PolylineProperties extends SVGGraphicsProperties, Properties {
  fill?: string;
  stroke?: string;
  strokeLinejoin?: 'arcs'|'bevel'|'miter'|'miter-clip'|'round';
  strokeWidth?: number|string;
  points: string;
}

export interface SVGProperties extends Properties {
  height?: number|string;
  viewBox?: string;
  width?: number|string;
}

export interface TextProperties extends SVGGraphicsProperties, Properties {
  dominantBaseline?:
      'auto'|'text-bottom'|'alphabetic'|'ideographic'|'middle'|'central'|'mathematical'|'hanging'
            |'text-top';
  textAnchor?: 'start'|'middle'|'end';
  x?: number|string;
  y?: number|string;
  dx?: number|string;
  dy?: number|string;
}

export type AnyProperties = InputProperties & Properties;
