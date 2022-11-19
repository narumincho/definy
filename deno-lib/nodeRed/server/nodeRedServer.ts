export type { EventEmitter } from "https://deno.land/std@0.165.0/node/events.ts";
import { Server } from "../../nodeType.ts";

export type NodeAPI = {
  readonly server: Server;
  readonly nodes: {
    /**
     * Called from a Node's constructor function, invokes the super-class
     * constructor and attaches any credentials to the node.
     * @param node the node object being created
     * @param def the instance definition for the node
     */
    createNode: (node: Node, def: NodeDef) => void;
    registerType: <
      TNode extends Node<TCreds>,
      TNodeDef extends NodeDef,
      TSets,
      TCreds extends Record<never, never>,
    >(
      type: string,
      constructor: NodeConstructor<TNode, TNodeDef, TCreds>,
      opts?: {
        credentials?: NodeCredentials<TCreds> | undefined;
        settings?: NodeSettings<TSets> | undefined;
      },
    ) => void;
    eachNode: (cb: (node: NodeDef) => void) => void;
    getNode: (id: string) => Node | null;
  };
};

/**
 * Node Instance Definition Object
 */
export type NodeDef = {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly z: string;
};

interface NodeConstructor<
  TNode extends Node<TCred>,
  TNodeDef extends NodeDef,
  TCred extends Record<never, never>,
> {
  (this: TNode, nodeDef: TNodeDef): void;
}

type NodeCredentials<TCreds> = {
  [K in keyof TCreds]: NodeCredential;
};

interface NodeCredential {
  type: "text" | "password";
}

type NodeSettings<TSets> = {
  [K in keyof TSets]: NodeSetting<TSets[K]>;
};

interface NodeSetting<T> {
  value: T;
  exportable?: boolean | undefined;
}

interface NodeContext extends NodeContextData {
  global: NodeContextData;
  flow: NodeContextData;
}

interface NodeContextData {
  /**
   * Get a value from context
   * @param key
   * @param storeName - store name when multiple context stores are used
   */
  get(key: string, storeName?: string): unknown;
  /**
   * Get a value from context asynchronously
   */
  get(key: string, cb: (err: Error, value: unknown) => void): void;
  /**
   * Get multiple values from context
   * @param keys
   * @param storeName - store name when multiple context stores are used
   */
  get(keys: string[], storeName?: string): unknown[];
  /**
   * Get multiple values from context asynchronously
   */
  get(keys: string[], cb: (err: Error, value: unknown[]) => void): void;

  /**
   * Get a value from context asynchronously, when multiple context stores are used
   */
  get(
    key: string,
    storeName: string | undefined,
    cb: (err: Error, value: unknown) => void,
  ): void;
  /**
   * Get multiple values from context asynchronously, when multiple context stores are used
   */
  get(
    keys: string[],
    storeName: string | undefined,
    cb: (err: Error, value: unknown[]) => void,
  ): void;

  /**
   * Set a value in context
   * @param key
   * @param value
   * @param cb - callback for async calls
   */
  set(key: string, value: unknown, cb?: (err: Error) => void): void;
  /**
   * Set multiple values in context
   * @param keys
   * @param values
   * @param cb - callback for async calls
   */
  set(keys: string[], values: unknown[], cb?: (err: Error) => void): void;

  /**
   * Set a value in context, when multiple context stores are used
   * @param key
   * @param value
   * @param storeName
   * @param cb - callback for async calls
   */
  set(
    key: string,
    value: unknown,
    storeName: string | undefined,
    cb?: (err: Error) => void,
  ): void;
  /**
   * Set multiple values in context, when multiple context stores are used
   * @param keys
   * @param values
   * @param storeName
   * @param cb - callback for async calls
   */
  set(
    keys: string[],
    values: unknown[],
    storeName: string | undefined,
    cb?: (err: Error) => void,
  ): void;

  /**
   * Returns a list of all node-scoped context property keys
   * @param storeName - store name when multiple context stores are used
   */
  keys(storeName?: string): string[];
  /**
   * Returns a list of all node-scoped context property keys asynchronously
   */
  keys(cb: (err: Error, value: unknown[]) => void): void;
  /**
   * Returns a list of all node-scoped context property keys asynchronously, when multiple context stores are used
   */
  keys(
    storeName: string | undefined,
    cb: (err: Error, value: unknown[]) => void,
  ): void;
}

export interface Node<
  TCreds extends Record<never, never> = Record<never, never>,
> extends EventEmitter {
  id: string;
  type: string;
  z: string;
  name?: string | undefined;
  credentials: TCreds;
  /**
   * Update the wiring configuration for this node.
   * @param wires -the new wiring configuration
   */
  updateWires(wires: Array<[]>): void;
  /**
   * Get the context object for this node.
   * @returnsthe context object
   */
  context(): NodeContext;
  /**
   * Called when the node is being stopped
   * @param  removed Whether the node has been removed, or just being stopped
   * @returns Promises which resolves when the node has closed
   */
  close(removed: boolean): Promise<void>;
  /**
   * Send a message to the nodes wired.
   * @param msg A message or array of messages to send
   */
  send(msg?: NodeMessage | Array<NodeMessage | NodeMessage[] | null>): void;
  /**
   * Receive a message.
   *
   * This will emit the `input` event with the provided message.
   * As of 1.0, this will return *before* any 'input' callback handler is invoked.
   */
  receive(msg?: NodeMessage): void;
  /**
   * Log an INFO level message
   */
  log(msg: unknown): void;
  /**
   * Log a WARN level message
   */
  warn(msg: unknown): void;
  /**
   * Log an ERROR level message
   */
  error(logMessage: unknown, msg?: NodeMessage): void;
  /**
   * Log an DEBUG level message
   */
  debug(msg: unknown): void;
  /**
   * Log an TRACE level message
   */
  trace(msg: unknown): void;
  /**
   * Log a metric event.
   * If called with no args, returns whether metric collection is enabled
   */
  metric(): boolean;
  metric(eventname: string, msg: NodeMessage, metricValue: number): void;
  /**
   * Set the node's status object
   *
   * status: { fill:"red|green", shape:"dot|ring", text:"blah" }
   * or
   * status: "simple text status"
   */
  status(status: string | NodeStatus): void;
  /**
   * Nodes register a listener on the input event to receive messages from the
   * up-stream nodes in a flow.
   * More info: https://nodered.org/docs/creating-nodes/node-js#receiving-messages
   */
  on(
    event: "input",
    listener: (
      msg: NodeMessageInFlow,
      send: (
        msg: NodeMessage | Array<NodeMessage | NodeMessage[] | null>,
      ) => void,
      done: (err?: Error) => void,
    ) => void,
  ): this;

  /**
   * Whenever a new flow is deployed, the existing nodes are deleted. If any of them
   * need to tidy up state when this happens, such as disconnecting from a remote
   * system, they should register a listener on the close event.
   * More info: https://nodered.org/docs/creating-nodes/node-js#closing-the-node
   */
  on(event: "close", listener: () => void): this;
  /**
   * If the node needs to do any asynchronous work to complete the tidy up, the
   * registered listener should accept an argument which is a function to be called
   * when all the work is complete.
   * More info: https://nodered.org/docs/creating-nodes/node-js#closing-the-node
   */
  on(event: "close", listener: (done: () => void) => void): this; // tslint:disable-line:unified-signatures
  /**
   * If the registered listener accepts two arguments, the first will be a boolean
   * flag that indicates whether the node is being closed because it has been removed
   * entirely, or that it is just being restarted.
   * More info: https://nodered.org/docs/creating-nodes/node-js#closing-the-node
   */
  on(
    event: "close",
    listener: (removed: boolean, done: () => void) => void,
  ): this; // tslint:disable-line:unified-signatures
}

interface NodeMessage {
  payload?: unknown | undefined;
  topic?: string | undefined;
  _msgid?: string | undefined;
}

interface NodeMessageInFlow extends NodeMessage {
  _msgid: string;
  /**
   * If there is a message sequence, then each message in a sequence has the ```parts``` property.
   * More info: https://nodered.org/docs/user-guide/messages#understanding-msgparts
   */
  parts?: NodeMessageParts | undefined;
}

interface NodeMessageParts {
  /** a unique identifier for the sequence */
  id: string;
  /** the message's position within the sequence */
  index: number;
  /** if known, the total number of messages in the sequence */
  count?: number | undefined;
}

export type NodeStatusFill = "red" | "green" | "yellow" | "blue" | "grey";
export type NodeStatusShape = "ring" | "dot";

interface NodeStatus {
  fill?: NodeStatusFill | undefined;
  shape?: NodeStatusShape | undefined;
  text?: string | undefined;
}
