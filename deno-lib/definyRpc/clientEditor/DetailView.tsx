import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import {
  DefinyRpcTypeInfo,
  FunctionDetail,
  Type,
  TypeBody,
} from "../core/coreType.ts";
import {
  functionNamespaceToString,
  namespaceEqual,
  namespaceToString,
} from "../codeGen/namespace.ts";

const containerStyle = toStyleAndHash({
  overflowWrap: "anywhere",
});

const box = toStyleAndHash({
  padding: 8,
});

export const DetailView = (props: {
  readonly functionList: ReadonlyArray<FunctionDetail>;
  readonly selectedFuncName: string | undefined;
  readonly typeList: ReadonlyArray<DefinyRpcTypeInfo>;
}): React.ReactElement => {
  if (props.selectedFuncName === undefined) {
    return (
      <div>
        <h2>未選択</h2>
      </div>
    );
  }
  const selectedFuncDetail = props.functionList.find(
    (func) =>
      functionNamespaceToString(func.namespace) + "." + func.name ===
        props.selectedFuncName,
  );

  if (selectedFuncDetail === undefined) {
    return (
      <div>
        <h2>不明な関数</h2>
      </div>
    );
  }
  return (
    <div className={c(containerStyle)}>
      <div>{functionNamespaceToString(selectedFuncDetail.namespace)}</div>
      <h2>{selectedFuncDetail.name}</h2>
      <div>{selectedFuncDetail.description}</div>
      <div>
        入力 input:
        <TypeView type={selectedFuncDetail.input} typeList={props.typeList} />
      </div>
      <div>
        出力 output:
        <TypeView type={selectedFuncDetail.output} typeList={props.typeList} />
      </div>
    </div>
  );
};

export const TypeView = <T extends unknown>(
  props: {
    readonly type: Type<T>;
    readonly typeList: ReadonlyArray<DefinyRpcTypeInfo>;
  },
): React.ReactElement => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const typeInfo = props.typeList.find((t) =>
    namespaceEqual(t.namespace, props.type.namespace) &&
    t.name === props.type.name
  );

  return (
    <div className={c(box)}>
      <div>
        {namespaceToString(props.type.namespace) + "." + props.type.name}
      </div>
      {isOpen
        ? (
          <div>
            <button
              onClick={() => {
                setIsOpen(false);
              }}
            >
              ▼
            </button>
            <div>
              {typeInfo
                ? <TypeInfoView typeInfo={typeInfo} typeList={props.typeList} />
                : <></>}
            </div>
          </div>
        )
        : (
          <div>
            <button
              onClick={() => {
                setIsOpen(true);
              }}
            >
              ▶
            </button>
          </div>
        )}
      <div className={c(box)}>
        {props.type.parameters.map((parameter, index) => (
          <TypeView
            key={index}
            type={parameter}
            typeList={props.typeList}
          />
        ))}
      </div>
    </div>
  );
};

const TypeInfoView = (
  props: {
    readonly typeInfo: DefinyRpcTypeInfo;
    readonly typeList: ReadonlyArray<DefinyRpcTypeInfo>;
  },
): React.ReactElement => {
  return (
    <div>
      <div>{props.typeInfo.description}</div>
      <TypeBodyView typeBody={props.typeInfo.body} typeList={props.typeList} />
    </div>
  );
};

const TypeBodyView = (
  props: {
    readonly typeBody: TypeBody;
    readonly typeList: ReadonlyArray<DefinyRpcTypeInfo>;
  },
): React.ReactElement => {
  switch (props.typeBody.type) {
    case "string":
      return <div>string</div>;
    case "number":
      return <div>number</div>;
    case "boolean":
      return <div>boolean</div>;
    case "unit":
      return <div>unit</div>;
    case "list":
      return <div>list</div>;
    case "set":
      return <div>set</div>;
    case "map":
      return <div>map</div>;
    case "url":
      return <div>url</div>;
    case "product": {
      return (
        <div>
          <div>product</div>
          <div>
            {props.typeBody.value.map((field) => (
              <div>
                <div>{field.name}</div>
                <div>{field.description}</div>
                <TypeView type={field.type} typeList={props.typeList} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "sum": {
      return (
        <div>
          <div>product</div>
          <div>
            {props.typeBody.value.map((pattern) => (
              <div>
                <div>{pattern.name}</div>
                <div>{pattern.description}</div>
                {pattern.parameter.type === "just" && (
                  <TypeView
                    type={pattern.parameter.value}
                    typeList={props.typeList}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
  }
};
