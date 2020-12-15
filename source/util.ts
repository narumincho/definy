export const mapMapValue = <Key, Input, Output>(
  input: ReadonlyMap<Key, Input>,
  func: (value: Input) => Output
): ReadonlyMap<Key, Output> => {
  const result: Map<Key, Output> = new Map();
  for (const [key, value] of input) {
    result.set(key, func(value));
  }
  return result;
};

export const mapFilter = <Key, Value>(
  map: ReadonlyMap<Key, Value>,
  predicate: (value: Value, key: Key) => boolean
): ReadonlyMap<Key, Value> => {
  const result: Map<Key, Value> = new Map();
  for (const [key, value] of map) {
    if (predicate(value, key)) {
      result.set(key, value);
    }
  }
  return result;
};

export const mapSet = <Key, Value>(
  map: ReadonlyMap<Key, Value>,
  key: Key,
  value: Value
): ReadonlyMap<Key, Value> => new Map(map).set(key, value);

export const mapKeyToSet = <Key, Value>(
  map: ReadonlyMap<Key, Value>
): ReadonlySet<Key> => new Set(map.keys());

export const setSubtract = <Value>(
  a: ReadonlySet<Value>,
  b: ReadonlySet<Value>
): ReadonlySet<Value> => {
  const result: Set<Value> = new Set();
  for (const value of a) {
    if (!b.has(value)) {
      result.add(value);
    }
  }
  return result;
};

export const setFilterMap = <Input, Output>(
  set: Set<Input>,
  func: (input: Input) => Output | undefined
): Set<Output> => {
  const result: Set<Output> = new Set();
  for (const value of set) {
    const outputValue = func(value);
    if (outputValue !== undefined) {
      result.add(outputValue);
    }
  }
  return result;
};

export const log = <T>(data: T, ...hint: ReadonlyArray<unknown>): T => {
  console.log(data, hint);
  return data;
};
