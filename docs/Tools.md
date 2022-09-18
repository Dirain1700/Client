# Tools

```ts
export declare const toId: (id: string) => string;
export declare const toRoomId: (id: string) => string;
export declare const sleep: (t: number) => Promise<unknown>;
export declare const rankList: GroupSymbol[];
export declare const sortByRank: (arr: GroupSymbol[]) => GroupSymbol[];
export declare const isHigherRank: (comparePosition: GroupSymbol, standard: GroupSymbol) => boolean;
```

### toId()

```ts
export declare const toId: (id: string) => string;
```

Returns input with special characters erased.
For example: `"This-Is_My*Favorite^Emoji: 'ω'"` => `thisismyfavoriteemoji`

### toRoomId()

```ts
export declare const toRoomId: (id: string) => string;
```

Returns input with special characters (except `-`) erased.
For example: `"This-Is_My*Favorite^Emoji: 'ω'"` => `this-ismyfavoriteemoji`

### sleep()

```ts
export declare const sleep: (t: number) => Promise<unknown>;
```

Sleeps for the time specified by `t`.
This function is asynchronous function, so required `await` or `then()`.

### rankList

```ts
export declare const rankList: GroupSymbol[];
```

An array of GroupSymbol.

```ts
export type GroupSymbol = string & ("~" | "&" | "#" | "★" | "*" | "@" | "%" | "☆" | "§" | "+" | "^" | " " | "‽" | "!");
```

### sortByRank()

```ts
export declare const sortByRank: (arr: GroupSymbol[]) => GroupSymbol[];
```

Returns array of GroupSymbol sorted in order of authority.

### isHigherRank()

```ts
export declare const isHigherRank: (comparePosition: GroupSymbol, standard: GroupSymbol) => boolean;
```

Returns boolean whether `comparePosition` is higher rank than `standard` or not.
