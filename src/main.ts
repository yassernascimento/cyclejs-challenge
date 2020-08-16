import xs, { Stream } from 'xstream'
import { run } from '@cycle/run'
import { makeDOMDriver } from '@cycle/dom'
import { makeJSONPDriver } from '@cycle/jsonp'
import { timeDriver } from '@cycle/time'
import app from './app'
import { Drivers } from './types'

function preventDefaultSinkDriver(prevented$: Stream<any>) {
  prevented$.addListener({
    next: ev => {
      ev.preventDefault()
      if (ev.type === 'blur') {
        ev.target.focus()
      }
    },
    error: () => { },
    complete: () => { },
  })
  return xs.empty()
}

const drivers: Drivers = {
  DOM: makeDOMDriver('#main-container'),
  JSONP: makeJSONPDriver(),
  preventDefault: preventDefaultSinkDriver,
  Time: timeDriver
}
run(app, { ...drivers });
