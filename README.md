# `@ddanshin94/typed-query-state`

Типобезопасная синхронизация состояния интерфейса с URL query parameters без ручного `URLSearchParams`.
Пакет не имеет production runtime dependencies; React adapter подключается отдельным entrypoint.

## Установка

```bash
npm install @ddanshin94/typed-query-state
```

## Быстрый старт

```ts
import { numberCodec } from '@ddanshin94/typed-query-state';
import { useQueryState } from '@ddanshin94/typed-query-state/react';

const [page, setPage, resetPage] = useQueryState('page', numberCodec, {
  defaultValue: 1,
  history: 'replace',
});

setPage((current) => (current ?? 1) + 1);
resetPage();
```

Для framework-agnostic кода используйте `createMemoryQuerySource`, `createBrowserQuerySource` и
`createQueryState`. `createBrowserQuerySource` вызывается только в browser runtime.

## Codecs

`stringCodec`, `numberCodec`, `booleanCodec`, `enumCodec` и `arrayCodec` определяют тип чтения и записи.
Malformed values возвращают `undefined`, а `defaultValue` задаёт fallback. Ошибка не бросается во время render.
Для диагностики передайте `onInvalid`, который получает `key`, исходные значения и категорию ошибки.

## SSR

Core не обращается к browser globals во время module evaluation. В React hooks можно передать `source` и
стабильный `serverSnapshot`, например `createMemoryQuerySource('/products?page=1')`. Browser source создаётся
лениво только внутри browser render.

## История навигации

`replace` используется по умолчанию, чтобы изменение фильтра не создавало лишнюю историю. `history: 'push'`
явно добавляет запись в history. При reset параметр удаляется, если значение совпадает с `defaultValue`.
Атомарное обновление нескольких ключей доступно через `useQueryStates` и `updateQueryStates`.

## Диагностика

`onEvent` получает structured-события `read`, `write`, `decode-fallback` и `navigation-mode`. Пакет не пишет
query values и URL в console по умолчанию. Скрипты проекта поддерживают `LOG_LEVEL=DEBUG|INFO`.

## Ограничения

Пакет не содержит router adapters, Next.js-specific интеграции, async codecs, server-side URL mutation или
автоматическую публикацию. Для React integration требуется React 18 или 19.

Подробный reference: [`docs/api.md`](docs/api.md).
