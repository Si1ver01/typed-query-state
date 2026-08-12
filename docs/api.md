# API reference

## Core

- `createMemoryQuerySource(initialUrl)` — детерминированный source для тестов и SSR.
- `createBrowserQuerySource()` — adapter над `history` и `popstate`; вызывается только в браузере.
- `createQueryState(source, key, codec, options)` — `get`, `set`, `reset`, `subscribe` для одного ключа.
- `updateQueryStates(source, updates, mode, onEvent?)` — атомарная запись нескольких ключей.

`QuerySource` хранит полный snapshot URL и обязан уведомлять подписчиков после navigation. `replace` не меняет
количество history entries, `push` добавляет entry.

## React

`useQueryState(key, codec, options)` возвращает `[value, setValue, reset]`. Setter принимает значение или
functional update. `useQueryStates(definitions, options)` возвращает typed object, общий setter и reset.
Оба hook принимают `onInvalid` и `onEvent` для единообразной диагностики чтения и записи.
React hooks доставляют диагностические callbacks после успешного commit, а core API — синхронно.

Оба hook используют `useSyncExternalStore`, поэтому subscription и server snapshot совместимы с concurrent
rendering. Передавайте собственный `QuerySource`, если router должен контролировать URL.

## Invalid input

`numberCodec` отклоняет пустые и non-finite значения при чтении и выбрасывает `RangeError` при попытке
закодировать non-finite число. `booleanCodec` принимает `true`/`false` и `1`/`0`,
`enumCodec` принимает только значения из whitelist. `arrayCodec` отклоняет весь массив, если хотя бы один
элемент invalid.
