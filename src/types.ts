import { VNode, DOMSource, MainDOMSource } from '@cycle/dom';
import { ResponseStream } from '@cycle/jsonp';
import { TimeSource } from '@cycle/time';
import xs, { Stream } from 'xstream';

// export type DOMDriver = (vnode$: xs<VNode>, name?: string) => DOMSource;
// export type JSONPDriver = (request$: xs<string>) => JSONPSource;
// export type PreventDefaultDriver = (source$: Stream<any>) => PreventDefaultSource;
// export type TimeDriver = (_: any, adapter: any) => TimeSource;

// export type JSONPSource = xs<ResponseStream>;
// export type PreventDefaultSource = Stream<any>;

// export type JSONPSource = (stream: Stream<string>) => Stream<ResponseStream>;
export type JSONPSource = any;
export type PreventDefaultSource = Stream<any>;

// export type Drivers = {
//   DOM: DOMDriver,
//   JSONP: JSONPDriver,
//   preventDefault: PreventDefaultDriver,
//   Time: TimeDriver,
// }

// export type Sources = {
//   DOM: DOMSource,
//   JSONP: JSONPSource,
//   preventDefault: PreventDefaultSource,
//   Time: TimeSource,
// }

// export type Sources = {
//   DOM: MainDOMSource,
//   JSONP: JSONPSource,
//   preventDefault: Stream<any>,
//   Time: TimeSource,
// }

export type Sources = {
  DOM: any,
  JSONP: any,
  preventDefault: Stream<any>,
  Time: any,
}
