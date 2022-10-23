/**
 * エディタ内で読み取れるNode RED の API
 */
declare const RED: {
  readonly nodes: { readonly registerType: (name: string, option: {}) => void };
};

interface Window {
  definyOriginUrlOnInput: () => void;
}
