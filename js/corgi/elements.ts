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
      rect: RectProperties;
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

interface SVGFilledProperties {
  fill?: string;
  fillOpacity?: number|string;
}

interface SVGStrokedProperties {
  stroke?: string;
  strokeLinecap?: 'butt'|'round'|'square';
  strokeLinejoin?: 'arcs'|'bevel'|'miter'|'miter-clip'|'round';
  strokeMiterlimit?: number|string;
  strokeOpacity?: number|string;
  strokeWidth?: number|string;
}

export interface AnchorProperties extends Properties {
  href?: string;
  target?: '_self'|'_blank'|'_parent'|'_top';
}

export interface ButtonProperties extends Properties {
  type?: 'submit';
}

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
  selected?: true;
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
  transform?: string;
  transformOrigin?: string;
  vectorEffect?: 'none'|'non-scaling-stroke'|'non-scaling-size'|'non-rotation'|'fixed-position';
}

export interface CircleProperties
    extends SVGGraphicsProperties, SVGFilledProperties, SVGStrokedProperties, Properties {
  cx: number|string;
  cy: number|string;
  r: number|string;
}

export interface GroupProperties
  extends
    Properties,
    SVGFilledProperties,
    SVGGraphicsProperties,
    SVGStrokedProperties,
    TextProperties {
}

export interface LineProperties extends SVGGraphicsProperties, SVGStrokedProperties, Properties {
  x1: number|string;
  y1: number|string;
  x2: number|string;
  y2: number|string;
}

export interface PathProperties
    extends SVGGraphicsProperties, SVGFilledProperties, SVGStrokedProperties, Properties {
  d: string;
}

export interface RectProperties
    extends SVGGraphicsProperties, SVGFilledProperties, SVGStrokedProperties, Properties {
  rx?: number|string;
  ry?: number|string;
  width: number|string;
  height: number|string;
  x: number|string;
  y: number|string;
}

export interface PolylineProperties
    extends SVGGraphicsProperties, SVGFilledProperties, SVGStrokedProperties, Properties {
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
  fontSize?: string;
  fontStretch?: number|string;
  textAnchor?: 'start'|'middle'|'end';
  x?: number|string;
  y?: number|string;
  dx?: number|string;
  dy?: number|string;
}

export type AnyProperties = InputProperties & Properties;
