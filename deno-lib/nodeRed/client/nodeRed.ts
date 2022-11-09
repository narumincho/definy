import { NodeStatusFill } from "../server/nodeRedServer.ts";

/**
 * エディタ内で読み取れるNode RED の API
 */
export const red = (
  window as unknown as {
    RED: {
      readonly nodes: {
        readonly registerType: <customProperty>(
          name: string,
          option: {
            readonly category: string;
            readonly color: string;
            readonly defaults: Record<string, unknown>;
            readonly inputs: number;
            readonly outputs: number;
            readonly label:
              | ((this: customProperty & ClientNode) => string)
              | string;
            readonly oneditsave?:
              | ((this: customProperty & ClientNode) => void)
              | undefined;
            readonly oneditprepare?:
              | ((this: customProperty & ClientNode) => void)
              | undefined;
          }
        ) => void;
      };
    };
  }
).RED;

type ClientNode = {
  readonly status: { fill: NodeStatusFill; shape: "dot"; text: string };
};

interface Window {
  definyOriginUrlOnInput: () => void;
}

export const dollar = (
  window as unknown as {
    $: (query: string) => {
      readonly typedInput: (param: {
        readonly type: Type;
        readonly types: ReadonlyArray<Type>;
        readonly typeField: string;
      }) => void;
    };
  }
).$;

type Type = "msg" | "flow" | "global" | "str" | "num" | "bool" | "json";
