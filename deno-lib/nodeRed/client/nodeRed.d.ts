/**
 * エディタ内で読み取れるNode RED の API
 */
declare const RED: {
  readonly nodes: {
    readonly registerType: <customProperty>(
      name: string,
      option: {
        readonly category: string;
        readonly color: string;
        readonly defaults: Record<string, unknown>;
        readonly inputs: number;
        readonly outputs: number;
        readonly label: ((this: customProperty) => string) | string;
        readonly oneditsave?: ((this: customProperty) => void) | undefined;
        readonly oneditprepare?: ((this: customProperty) => void) | undefined;
      }
    ) => void;
  };
};

interface Window {
  definyOriginUrlOnInput: () => void;
}

declare const $: (query: string) => {
  readonly typedInput: (param: {
    readonly type: Type;
    readonly types: ReadonlyArray<Type>;
    readonly typeField: string;
  }) => void;
};

type Type = "msg" | "flow" | "global" | "str" | "num" | "bool" | "json";
