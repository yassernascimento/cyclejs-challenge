import xs, {Stream} from 'xstream'
import debounce from 'xstream/extra/debounce'
import dropUntil from 'xstream/extra/dropUntil'
import {
  ul,
  li,
  span,
  input,
  button,
  div,
  section,
  label,
  DOMSource,
  VNode,
  MainDOMSource,
} from '@cycle/dom'
import {TimeSource} from '@cycle/time'
import {Map as ImmutableMap, List as ImmutableList} from 'immutable'
import {Reducer, StateSource} from '@cycle/state'

type Sources = {
  DOM: DOMSource
  Time: TimeSource
  state: StateSource<State>
  JSONP: any
  preventDefault: Stream<any>
}
type Sinks = {
  DOM: Stream<VNode>
  state: Stream<Reducer<State>>
  preventDefault: any
  JSONP: any
}
type Actions = {[key: string]: Stream<any>}
type State = ImmutableMap<string, any>
type State$ = Stream<State>
type SimplifiedState = Partial<{
  suggestions: string[]
  highlighted: string
  selected: string
  selectedList: string[]
}>
type WikipediaAPIResponse = [string, string[], string[], string[]]

const containerStyle = {
  background: '#EFEFEF',
  padding: '5px',
}

const sectionStyle = {
  marginBottom: '10px',
}

const searchLabelStyle = {
  display: 'inline-block',
  width: '100px',
  textAlign: 'right',
}

const comboBoxStyle = {
  position: 'relative',
  display: 'inline-block',
  width: '300px',
}

const inputTextStyle = {
  padding: '5px',
}

const autocompleteableStyle = Object.assign({}, inputTextStyle, {
  width: '100%',
  boxSizing: 'border-box',
})

const autocompleteMenuStyle = {
  position: 'absolute',
  left: '0px',
  right: '0px',
  top: '25px',
  zIndex: '999',
  listStyle: 'none',
  backgroundColor: 'white',
  margin: '0',
  padding: '0',
  borderTop: '1px solid #ccc',
  borderLeft: '1px solid #ccc',
  borderRight: '1px solid #ccc',
  boxSizing: 'border-box',
  boxShadow: '0px 4px 4px rgb(220,220,220)',
  userSelect: 'none',
  '-moz-box-sizing': 'border-box',
  '-webkit-box-sizing': 'border-box',
  '-webkit-user-select': 'none',
  '-moz-user-select': 'none',
}

const autocompleteItemStyle = {
  cursor: 'pointer',
  listStyle: 'none',
  padding: '3px 0 3px 8px',
  margin: '0',
  borderBottom: '1px solid #ccc',
}

const LIGHT_GREEN = '#8FE8B4'

/**
 * source: --a--b----c----d---e-f--g----h---i--j-----
 * first:  -------F------------------F---------------
 * second: -----------------S-----------------S------
 *                         between
 * output: ----------c----d-------------h---i--------
 */
function between(first: Stream<any>, second: Stream<any>) {
  return (source: Stream<any>) => first.mapTo(source.endWhen(second)).flatten()
}

/**
 * source: --a--b----c----d---e-f--g----h---i--j-----
 * first:  -------F------------------F---------------
 * second: -----------------S-----------------S------
 *                       notBetween
 * output: --a--b-------------e-f--g-----------j-----
 */
function notBetween(first: Stream<any>, second: Stream<any>) {
  return (source: Stream<any>) =>
    xs.merge(
      source.endWhen(first),
      first.map(() => source.compose(dropUntil(second))).flatten()
    )
}

function intent(domSource: MainDOMSource, timeSource: TimeSource): Actions {
  const UP_KEYCODE = 38
  const DOWN_KEYCODE = 40
  const ENTER_KEYCODE = 13
  const TAB_KEYCODE = 9

  const input$ = domSource.select('.autocompleteable').events('input')
  const keydown$ = domSource.select('.autocompleteable').events('keydown')
  const itemHover$ = domSource.select('.autocomplete-item').events('mouseenter')
  const itemMouseDown$ = domSource
    .select('.autocomplete-item')
    .events('mousedown')
  const itemMouseUp$ = domSource.select('.autocomplete-item').events('mouseup')
  const inputFocus$ = domSource.select('.autocompleteable').events('focus')
  const inputBlur$ = domSource.select('.autocompleteable').events('blur')
  const deleteClick$ = domSource.select('.delete-btn').events('click')

  const enterPressed$ = keydown$.filter(
    ({keyCode}) => keyCode === ENTER_KEYCODE
  )
  const tabPressed$ = keydown$.filter(({keyCode}) => keyCode === TAB_KEYCODE)
  const clearField$ = input$.filter(ev => (ev.target as any).value.length === 0)
  const inputBlurToItem$ = inputBlur$.compose(
    between(itemMouseDown$, itemMouseUp$)
  )
  const inputBlurToElsewhere$ = inputBlur$.compose(
    notBetween(itemMouseDown$, itemMouseUp$)
  )
  const itemMouseClick$ = itemMouseDown$
    .map(down => itemMouseUp$.filter(up => down.target === up.target))
    .flatten()
  const deleteSelectedItemIndex$ = deleteClick$.map(
    ev => (ev.target as any).dataset.index
  )

  return {
    search$: input$
      .compose(timeSource.debounce(500))
      .compose(between(inputFocus$, inputBlur$))
      .map(ev => ev.target.value)
      .filter(query => query.length > 0),
    moveHighlight$: keydown$
      .map(({keyCode}) => {
        switch (keyCode) {
          case UP_KEYCODE:
            return -1
          case DOWN_KEYCODE:
            return +1
          default:
            return 0
        }
      })
      .filter(delta => delta !== 0),
    setHighlight$: itemHover$.map(ev =>
      parseInt((ev.target as any).dataset.index)
    ),
    keepFocusOnInput$: xs.merge(inputBlurToItem$, enterPressed$, tabPressed$),
    selectHighlighted$: xs
      .merge(itemMouseClick$, enterPressed$, tabPressed$)
      .compose(debounce(1)),
    wantsSuggestions$: xs.merge(
      inputFocus$.mapTo(true),
      inputBlur$.mapTo(false)
    ),
    quitAutocomplete$: xs.merge(clearField$, inputBlurToElsewhere$),
    deleteSelectedItemIndex$,
  }
}

function reducers(
  actions: Actions,
  suggestionsFromResponse$: Stream<string[]>
) {
  const moveHighlightReducer$ = actions.moveHighlight$.map(
    delta => (state: State) => {
      const suggestions = state.get('suggestions')
      const wrapAround = x => (x + suggestions.length) % suggestions.length
      return state.update('highlighted', highlighted => {
        if (highlighted === null) {
          return wrapAround(Math.min(delta, 0))
        } else {
          return wrapAround(highlighted + delta)
        }
      })
    }
  )

  const setHighlightReducer$ = actions.setHighlight$.map(
    highlighted => (state: State) => state.set('highlighted', highlighted)
  )

  const selectHighlightedReducer$ = actions.selectHighlighted$
    .mapTo(xs.of(true, false))
    .flatten()
    .map(selected => (state: State) => {
      const suggestions = state.get('suggestions')
      const highlighted = state.get('highlighted')
      const hasHighlight = highlighted !== null
      const isMenuEmpty = suggestions.length === 0
      if (selected && hasHighlight && !isMenuEmpty) {
        const newSelected = suggestions[highlighted]
        return state
          .set('selected', newSelected)
          .set('suggestions', [])
          .update('selectedList', list => list.push(newSelected))
      } else {
        return state.set('selected', null)
      }
    })

  const hideReducer$ = actions.quitAutocomplete$.mapTo((state: State) =>
    state.set('suggestions', [])
  )

  const deleteSelectedItemReducer$ = actions.deleteSelectedItemIndex$.map(
    index => (state: State) =>
      state.update('selectedList', list => list.delete(index))
  )

  const querySuggestionsReducer$ = actions.wantsSuggestions$
    .map(accepted =>
      suggestionsFromResponse$.map(suggestions => (accepted ? suggestions : []))
    )
    .flatten()
    .map(suggestions => (state: State) =>
      state
        .set('suggestions', suggestions)
        .set('highlighted', null)
        .set('selected', null)
    )

  return xs.merge(
    moveHighlightReducer$,
    setHighlightReducer$,
    selectHighlightedReducer$,
    hideReducer$,
    querySuggestionsReducer$,
    deleteSelectedItemReducer$
  )
}

function model(suggestionsFromResponse$: Stream<string[]>, actions: Actions) {
  const reducers$ = reducers(actions, suggestionsFromResponse$)

  const initReducer$ = xs.of(() =>
    ImmutableMap({
      suggestions: [],
      highlighted: null,
      selected: null,
      selectedList: ImmutableList([]),
    })
  )

  return xs.merge(initReducer$, reducers$)
}

function renderAutocompleteMenu({suggestions, highlighted}: SimplifiedState) {
  if (suggestions.length === 0) {
    return ul()
  }
  const childStyle = index =>
    Object.assign({}, autocompleteItemStyle, {
      backgroundColor: highlighted === index ? LIGHT_GREEN : null,
    })

  return ul(
    '.autocomplete-menu',
    {style: autocompleteMenuStyle},
    suggestions.map((suggestion, index) =>
      li(
        '.autocomplete-item',
        {style: childStyle(index), attrs: {'data-index': index}},
        suggestion
      )
    )
  )
}

function renderComboBox({suggestions, highlighted, selected}: SimplifiedState) {
  return span('.combo-box', {style: comboBoxStyle}, [
    input('.autocompleteable', {
      style: autocompleteableStyle,
      attrs: {type: 'text'},
      hook: {
        update: (old, {elm}) => {
          if (selected !== null) {
            elm.value = selected
          }
        },
      },
    }),
    renderAutocompleteMenu({suggestions, highlighted}),
  ])
}

function renderSelectedList({selectedList}: SimplifiedState) {
  return ul(
    selectedList.map((selectedEl, index) =>
      div([
        li({style: {}}, selectedEl),
        button('.delete-btn', {attrs: {'data-index': index}}, 'x'),
      ])
    )
  )
}

function view(state$: State$): Stream<VNode> {
  return state$.map(state => {
    const suggestions = state.get('suggestions')
    const highlighted = state.get('highlighted')
    const selected = state.get('selected')
    const selectedList = state.get('selectedList').toArray()

    return div('.container', {style: containerStyle}, [
      section({style: sectionStyle}, [
        label('.search-label', {style: searchLabelStyle}, 'Query:'),
        renderComboBox({suggestions, highlighted, selected}),
      ]),
      section({style: sectionStyle}, [
        label({style: searchLabelStyle}, 'Some field:'),
        input({style: inputTextStyle, attrs: {type: 'text'}}),
      ]),
      section({style: sectionStyle}, [renderSelectedList({selectedList})]),
    ])
  })
}

const BASE_URL =
  'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search='

const networking = {
  processResponses(JSONP) {
    return JSONP.filter(res$ => res$.request.indexOf(BASE_URL) === 0)
      .flatten()
      .map((res: WikipediaAPIResponse) => res[1])
  },

  generateRequests(searchQuery$) {
    return searchQuery$.map(q => BASE_URL + encodeURI(q))
  },
}

function preventedEvents(actions: Actions, state$: State$) {
  return state$
    .map(state =>
      actions.keepFocusOnInput$.map(event => {
        const hasSuggestionsToChoose =
          state.get('suggestions').length > 0 &&
          state.get('highlighted') !== null
        return hasSuggestionsToChoose ? event : null
      })
    )
    .flatten()
    .filter(ev => ev !== null)
}

export default function app(sources: Sources): Sinks {
  const suggestionsFromResponse$ = networking.processResponses(sources.JSONP)
  const actions = intent(sources.DOM as MainDOMSource, sources.Time)
  const state$: State$ = sources.state.stream
  const reducer$ = model(suggestionsFromResponse$, actions)
  const vtree$ = view(state$)
  const prevented$ = preventedEvents(actions, state$)
  const searchRequest$ = networking.generateRequests(actions.search$)

  return {
    DOM: vtree$,
    state: reducer$,
    preventDefault: prevented$,
    JSONP: searchRequest$,
  }
}
