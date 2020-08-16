import { VNode, DOMSource } from '@cycle/dom';
import { ResponseStream } from '@cycle/jsonp';
import { TimeSource } from '@cycle/time';
import xs, { Stream } from 'xstream';

export type DOMDriver = (vnode$: xs<VNode>, name?: string) => DOMSource;
export type JSONPDriver = (request$: xs<string>) => JSONPSource;
export type PreventDefaultDriver = (source$: Stream<any>) => PreventDefaultSource;
export type TimeDriver = (_: any, adapter: any) => TimeSource;

export type JSONPSource = xs<ResponseStream>;
export type PreventDefaultSource = Stream<any>;

export type Drivers = {
  DOM: DOMDriver,
  JSONP: JSONPDriver,
  preventDefault: PreventDefaultDriver,
  Time: TimeDriver,
}

export type Sources = {
  DOM: DOMSource,
  JSONP: JSONPSource,
  preventDefault: PreventDefaultSource,
  Time: TimeSource,
}
