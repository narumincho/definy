/* eslint-disable prefer-destructuring */
/* eslint-disable no-shadow */
import * as d from "./data";

type Dict<key, value> = ReadonlyMap<key, value>;

/**
 * 辞書. JavaScriptの ReadonlyMap で扱う
 * @typePartId c3fc2a6cea61086db59e11dc2bef0eee
 */
export const Dict: {
  readonly codec: <key extends unknown, value extends unknown>(
    a: d.Codec<key>,
    b: d.Codec<value>
  ) => d.Codec<Dict<key, value>>;
} = {
  codec: <key extends unknown, value extends unknown>(
    keyCodec: d.Codec<key>,
    valueCodec: d.Codec<value>
  ): d.Codec<Dict<key, value>> => ({
    encode: (value: Dict<key, value>): ReadonlyArray<number> => {
      let result: Array<number> = d.Int32.codec.encode(
        value.size
      ) as Array<number>;
      for (const element of value) {
        result = [
          ...result,
          ...keyCodec.encode(element[0]),
          ...valueCodec.encode(element[1]),
        ];
      }
      return result;
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Dict<key, value>; readonly nextIndex: number } => {
      const lengthResult: {
        readonly result: number;
        readonly nextIndex: number;
      } = d.Int32.codec.decode(index, binary);
      let { nextIndex } = lengthResult;
      const result: Map<key, value> = new Map();
      for (let i = 0; i < lengthResult.result; i += 1) {
        const keyResult: {
          readonly result: key;
          readonly nextIndex: number;
        } = keyCodec.decode(nextIndex, binary);
        const valueResult: {
          readonly result: value;
          readonly nextIndex: number;
        } = valueCodec.decode(keyResult.nextIndex, binary);
        result.set(keyResult.result, valueResult.result);
        nextIndex = valueResult.nextIndex;
      }
      return { result, nextIndex };
    },
  }),
};
