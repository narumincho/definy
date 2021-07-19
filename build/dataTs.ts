import * as d from "../data";
import { promises as fileSystem } from "fs";
import { generateTypeScriptCodeAsString } from "../core/main";

const coreProjectId: d.ProjectId = d.ProjectId.fromString(
  "96deb95f697e66f12a55e4d3910ea509"
);

const resourceStateData: d.TypePartId = d.TypePartId.fromString(
  "cdf3576a38b1f792a7e2f9e21598ae06"
);
const maybeValue: d.TypePartId = d.TypePartId.fromString(
  "7340e6b552af43695335a64e057f4250"
);
const withTimeData: d.TypePartId = d.TypePartId.fromString(
  "1aa6b16efd6aaeebaf0fc58f3c2c5997"
);
const staticResourceStateData: d.TypePartId = d.TypePartId.fromString(
  "5ef14dcfa0f01d9a505b7b00e223a922"
);
const resultOk: d.TypePartId = d.TypePartId.fromString(
  "2163b3c97b382de8085973eff850c919"
);
const resultError: d.TypePartId = d.TypePartId.fromString(
  "bd8be8409130f30f15c5c86c01de6dc5"
);
const tuple2First: d.TypePartId = d.TypePartId.fromString(
  "85f328c72b935491618d127811a328a5"
);
const tuple2Second: d.TypePartId = d.TypePartId.fromString(
  "6276b43c4866574cc345f2055fceb291"
);

const typePartList: ReadonlyArray<d.TypePart> = [
  {
    id: d.ElmVariant.typePartId,
    name: "ElmVariant",
    description: "バリアント. 値コンストラクタ. タグ",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: d.TypePartBody.Product([
      {
        name: "name",
        description: "バリアント名",
        type: {
          typePartId: d.ElmVariantName.typePartId,
          parameter: [],
        },
      },
      {
        name: "parameter",
        description: "パラメーター",
        type: {
          typePartId: d.List.typePartId,
          parameter: [
            {
              typePartId: d.ElmType.typePartId,
              parameter: [],
            },
          ],
        },
      },
    ]),
  },
  {
    id: d.ExportDefinition.typePartId,
    name: "ExportDefinition",
    description: "外部に公開する定義",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: d.TypePartBody.Sum([
      {
        name: "TypeAlias",
        description: "TypeAlias",
        parameter: d.Maybe.Just<d.Type>({
          typePartId: d.TypeAlias.typePartId,
          parameter: [],
        }),
      },
      {
        name: "Function",
        description: "Function",
        parameter: d.Maybe.Just<d.Type>({
          typePartId: d.Function.typePartId,
          parameter: [],
        }),
      },
      {
        name: "Variable",
        description: "Variable",
        parameter: {
          _: "Just",
          value: {
            typePartId: d.Variable.typePartId,
            parameter: [],
          },
        },
      },
    ]),
  },
  {
    id: d.UnaryOperatorExpr.typePartId,
    name: "UnaryOperatorExpr",
    description: "単項演算子と適用される式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "operator",
          description: "単項演算子",
          type: {
            typePartId: d.UnaryOperator.typePartId,
            parameter: [],
          },
        },
        {
          name: "expr",
          description: "適用される式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ProjectId.typePartId,
    name: "ProjectId",
    description: "プロジェクトの識別子",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
  },
  {
    id: d.Language.typePartId,
    name: "Language",
    description:
      "英語,日本語,エスペラント語\n\nナルミンチョが使える? プログラミングじゃない言語",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Japanese",
          description: "日本語",
          parameter: { _: "Nothing" },
        },
        {
          name: "English",
          description: "英語",
          parameter: { _: "Nothing" },
        },
        {
          name: "Esperanto",
          description: "エスペラント語",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.ElmTypeName.typePartId,
    name: "ElmTypeName",
    description: "Elmで使う型の名前. Elmで使える型名ということを確認済み",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "ElmTypeName",
          description:
            '**直接 ElmTypeName.ElmTypeName("Int") と指定してはいけない!! Elmの識別子として使える文字としてチェックできないため**',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.Int32.typePartId,
    name: "Int32",
    description:
      "-2 147 483 648 ～ 2 147 483 647. 32bit 符号付き整数. JavaScriptのnumberとして扱える. numberの32bit符号あり整数をSigned Leb128のバイナリに変換する",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Int32" },
  },
  {
    id: d.ElmType.typePartId,
    name: "ElmType",
    description: "Elm の 型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "ImportedType",
          description: "インポートした型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmImportedType.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "TypeParameter",
          description: "型パラメーター",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Function",
          description: "関数",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmFunctionType.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "List",
          description: "List リスト",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmType.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Tuple0",
          description: "() 1種類の値だけ持つ型. Unit",
          parameter: { _: "Nothing" },
        },
        {
          name: "Tuple2",
          description: "(a, b)",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmTuple2.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Tuple3",
          description: "(a, b, c)",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmTuple3.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Record",
          description: "{ name: String, age: Int } レコード型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.ElmField.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "LocalType",
          description: "モジュール内にある型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmLocalType.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.TsType.typePartId,
    name: "TsType",
    description: "",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Number",
          description: "プリミティブの型のnumber",
          parameter: { _: "Nothing" },
        },
        {
          name: "String",
          description: "プリミティブの型のstring",
          parameter: { _: "Nothing" },
        },
        {
          name: "Boolean",
          description: "プリミティブの型のboolean",
          parameter: { _: "Nothing" },
        },
        {
          name: "Undefined",
          description: "プリミティブの型のundefined",
          parameter: { _: "Nothing" },
        },
        {
          name: "Null",
          description: "プリミティブの型のnull",
          parameter: { _: "Nothing" },
        },
        {
          name: "Never",
          description: "never型",
          parameter: { _: "Nothing" },
        },
        {
          name: "Void",
          description: "void型",
          parameter: { _: "Nothing" },
        },
        {
          name: "Object",
          description: "オブジェクト",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.TsMemberType.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "Function",
          description: "関数 `(parameter: parameter) => returnType`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.FunctionType.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "WithTypeParameter",
          description:
            "型パラメータ付きの型 `Promise<number>` `ReadonlyArray<string>`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsTypeWithTypeParameter.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Union",
          description: "ユニオン型 `a | b`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.TsType.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "Intersection",
          description: '"交差型 `left & right`',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.IntersectionType.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ImportedType",
          description: "インポートされた外部の型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ImportedType.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ScopeInFile",
          description: "ファイル内で定義された型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsIdentifer.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ScopeInGlobal",
          description: "グローバル空間の型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsIdentifer.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "StringLiteral",
          description: "文字列リテラル型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.ResourceState.typePartId,
    name: "ResourceState",
    description:
      "Project, Account, TypePartなどのリソースの状態とデータ. 読み込み中だとか",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [
      {
        name: "data",
        typePartId: resourceStateData,
      },
    ],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Loaded",
          description: "読み込み済み",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.WithTime.typePartId,
              parameter: [
                {
                  typePartId: resourceStateData,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "Deleted",
          description: "削除されたか, 存在しない",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.Time.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Unknown",
          description: "削除されたか, 存在しない",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.Time.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Requesting",
          description: "サーバに問い合わせ中",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.Unit.typePartId,
    name: "Unit",
    description: "Unit. 1つの値しかない型. JavaScriptのundefinedで扱う",
    projectId: coreProjectId,
    attribute: { _: "Just", value: "AsUndefined" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "UnitValue",
          description: "Unit型にある.唯一の値",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.TypeAttribute.typePartId,
    name: "TypeAttribute",
    description: "コンパイラに向けた, 型のデータ形式をどうするかの情報",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "AsBoolean",
          description:
            "JavaScript, TypeScript で boolean として扱うように指示する. 定義が2つのパターンで両方パラメーターなし false, trueの順である必要がある",
          parameter: { _: "Nothing" },
        },
        {
          name: "AsUndefined",
          description:
            "JavaScript, TypeScript で undefined として扱うように指示する. 定義が1つのパターンでパラメーターなしである必要がある",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.ElmField.typePartId,
    name: "ElmField",
    description: "",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "フィールド名",
          type: {
            typePartId: d.ElmFieldName.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.TsTypeWithTypeParameter.typePartId,
    name: "TsTypeWithTypeParameter",
    description: "パラメーター付きの型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "type",
          description: "パラメーターをつけられる型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
        {
          name: "typeParameterList",
          description:
            "パラメーターに指定する型. なにも要素を入れなけければ T<>ではなく T の形式で出力される",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsType.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.EvaluateExprError.typePartId,
    name: "EvaluateExprError",
    description: "評価したときに失敗した原因を表すもの",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "NeedPartDefinition",
          description: "式を評価するには,このパーツの定義が必要だと言っている",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.PartId.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Blank",
          description: "計算結果にblankが含まれている",
          parameter: { _: "Nothing" },
        },
        {
          name: "TypeError",
          description: "型が合わない",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "NotSupported",
          description: "まだサポートしていないものが含まれている",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.TsIdentifer.typePartId,
    name: "TsIdentifer",
    description: "TypeScriptの識別子として使える文字",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Identifer",
          description:
            '**直接 Identifer.Identifer("name") と指定してはいけない!! TypeScriptの識別子として使える文字としてチェックできないため**',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.ElmLocalType.typePartId,
    name: "ElmLocalType",
    description: "モジュール内の型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "typeName",
          description: "型名",
          type: {
            typePartId: d.ElmTypeName.typePartId,
            parameter: [],
          },
        },
        {
          name: "parameter",
          description: "型パラメーター",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.ElmType.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.FunctionCall.typePartId,
    name: "FunctionCall",
    description: "関数呼び出し",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "function",
          description: "関数",
          type: {
            typePartId: d.Expr.typePartId,
            parameter: [],
          },
        },
        {
          name: "parameter",
          description: "パラメーター",
          type: {
            typePartId: d.Expr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Maybe.typePartId,
    name: "Maybe",
    description:
      "Maybe. nullableのようなもの. 今後はRustのstd::Optionに出力するために属性をつけよう (確信)",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [{ name: "value", typePartId: maybeValue }],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Just",
          description: "値があるということ",
          parameter: {
            _: "Just",
            value: {
              typePartId: maybeValue,
              parameter: [],
            },
          },
        },
        {
          name: "Nothing",
          description: "値がないということ",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.ArrayItem.typePartId,
    name: "ArrayItem",
    description: "配列リテラルの要素",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "spread",
          description: "スプレッド ...a のようにするか",
          type: {
            typePartId: d.Bool.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Binary.typePartId,
    name: "Binary",
    description:
      "バイナリ. JavaScriptのUint8Arrayで扱える. 最初にLED128でバイト数, その次にバイナリそのまま",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Binary" },
  },
  {
    id: d.ElmTuple3.typePartId,
    name: "ElmTuple3",
    description: "3つの要素のタプルの型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "first",
          description: "左の型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
        {
          name: "second",
          description: "真ん中の型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
        {
          name: "third",
          description: "右の型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ElmImportedType.typePartId,
    name: "ElmImportedType",
    description: "外部のモジュールの型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "moduleName",
          description: "モジュール名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "typeName",
          description: "型名",
          type: {
            typePartId: d.ElmTypeName.typePartId,
            parameter: [],
          },
        },
        {
          name: "parameter",
          description: "型パラメーター",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.ElmType.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.BinaryOperator.typePartId,
    name: "BinaryOperator",
    description: "2項演算子",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Exponentiation",
          description: "べき乗 `a ** b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "Multiplication",
          description: "数値の掛け算 `a * b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "Division",
          description: "数値の割り算 `a / b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "Remainder",
          description: "剰余演算 `a % b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "Addition",
          description: "数値の足し算, 文字列の結合 `a + b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "Subtraction",
          description: "数値の引き算 `a - b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "LeftShift",
          description: "左シフト `a << b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "SignedRightShift",
          description: "符号を維持する右シフト `a >> b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "UnsignedRightShift",
          description: "符号を維持しない(0埋め)右シフト `a >>> b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "LessThan",
          description: "未満 `a < b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "LessThanOrEqual",
          description: "以下 `a <= b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "Equal",
          description: "等号 `a === b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "NotEqual",
          description: "不等号 `a !== b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "BitwiseAnd",
          description: "ビットAND `a & b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "BitwiseXOr",
          description: "ビットXOR `a ^ b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "BitwiseOr",
          description: "ビットOR `a | b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "LogicalAnd",
          description: "論理AND `a && b`",
          parameter: { _: "Nothing" },
        },
        {
          name: "LogicalOr",
          description: "論理OR `a || b`",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.TypeAssertion.typePartId,
    name: "TypeAssertion",
    description: "型アサーション",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "型アサーションを受ける式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.UnaryOperator.typePartId,
    name: "UnaryOperator",
    description: "JavaScriptの単項演算子",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Minus",
          description: "単項マイナス演算子 `-a`",
          parameter: { _: "Nothing" },
        },
        {
          name: "BitwiseNot",
          description: "ビット否定 `~a`",
          parameter: { _: "Nothing" },
        },
        {
          name: "LogicalNot",
          description: "論理否定 `!a`",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.TypePartBody.typePartId,
    name: "TypePartBody",
    description: "型の定義本体",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Product",
          description: "直積型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.Member.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "Sum",
          description: "直和型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.Pattern.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "Kernel",
          description: "Definyだけでは表現できないデータ型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TypePartBodyKernel.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.ElmCustomTypeExportLevel.typePartId,
    name: "ElmCustomTypeExportLevel",
    description: "カスタム型の公開レベル",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "NoExport",
          description: "公開しない",
          parameter: { _: "Nothing" },
        },
        {
          name: "ExportTypeOnly",
          description:
            "型の指定のみ公開. 外部のモジュールで値の構成とパターンマッチングの分岐がされることはない",
          parameter: { _: "Nothing" },
        },
        {
          name: "ExportTypeAndVariant",
          description:
            "型とバリアントを公開する. 外部のモジュールで値の構成とパターンマッチングができる",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.Parameter.typePartId,
    name: "Parameter",
    description: "関数のパラメーター. パラメーター名, 型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "パラメーター名",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "パラメーターの型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Dict.typePartId,
    name: "Dict",
    description: "辞書型. TypeScriptでは ReadonlyMap として扱う",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [
      {
        name: "key",
        typePartId: d.TypePartId.fromString("cb26a5badbccc2f37b8e9a1904867d2d"),
      },
      {
        name: "value",
        typePartId: d.TypePartId.fromString("3471e961a12c6ec91d511d074cbe3838"),
      },
    ],
    body: { _: "Kernel", typePartBodyKernel: "Dict" },
  },
  {
    id: d.WithTime.typePartId,
    name: "WithTime",
    description: "取得日時と任意のデータ",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [{ name: "data", typePartId: withTimeData }],
    body: {
      _: "Product",
      memberList: [
        {
          name: "getTime",
          description: "データベースから取得した日時",
          type: {
            typePartId: d.Time.typePartId,
            parameter: [],
          },
        },
        {
          name: "data",
          description: "データ",
          type: {
            typePartId: withTimeData,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ElmTypeAlias.typePartId,
    name: "ElmTypeAlias",
    description:
      "型エイリアス. 型に名前を付け, レコード型の場合, その名前の関数を作成する",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "型エイリアス名",
          type: {
            typePartId: d.ElmTypeName.typePartId,
            parameter: [],
          },
        },
        {
          name: "export",
          description: "外部に公開するか",
          type: {
            typePartId: d.Bool.typePartId,
            parameter: [],
          },
        },
        {
          name: "comment",
          description: "コメント",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "parameter",
          description: "型パラメーター",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.String.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "type",
          description: "別名を付ける型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    name: "PartId",
    description: "パーツの識別子",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
    id: d.PartId.typePartId,
  },
  {
    id: d.AccountTokenAndUserId.typePartId,
    name: "AccountTokenAndUserId",
    description: "AccountToken と UserId",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "accountToken",
          description: "accountToken",
          type: {
            typePartId: d.AccountToken.typePartId,
            parameter: [],
          },
        },
        {
          name: "userId",
          description: "UserId",
          type: {
            typePartId: d.AccountId.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.TagId.typePartId,
    name: "TagId",
    description:
      "タグの識別子. タグは直和型に使うもの.\n\n実行時に使わないことは確定しているが, コード内の形式としてタグにUUIDを使うべきかは考慮中. index で充分かと思ったが別に型の情報も必要になることが多い",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
  },
  {
    id: d.ElmFunctionType.typePartId,
    name: "ElmFunctionType",
    description: "関数の型. 入力と出力",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "input",
          description: "入力の型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
        {
          name: "output",
          description: "出力の型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.TsPattern.typePartId,
    name: "TsPattern",
    description: 'switch文のcase "text": { statementList } の部分',
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "caseString",
          description: "case に使う文字列",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "statementList",
          description: "マッチしたときに実行する部分",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Statement.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.ElmCode.typePartId,
    name: "ElmCode",
    description: "Elmのコードを表現するもの",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "moduleName",
          description: "モジュール名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "typeDeclarationList",
          description: "型定義",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.ElmTypeDeclaration.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.TypePartBodyKernel.typePartId,
    name: "TypePartBodyKernel",
    description: "Definyだけでは表現できないデータ型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Int32",
          description: "32bit整数",
          parameter: { _: "Nothing" },
        },
        {
          name: "String",
          description:
            "文字列. Definyだけで表現できるが, TypeScriptでstringとして扱うために必要",
          parameter: { _: "Nothing" },
        },
        {
          name: "Binary",
          description: "バイナリ型. TypeScriptではUint8Arrayとして扱う",
          parameter: { _: "Nothing" },
        },
        {
          name: "Id",
          description:
            "UUID (16byte) を表現する. 内部表現はとりあえず0-f長さ32の文字列",
          parameter: { _: "Nothing" },
        },
        {
          name: "Token",
          description:
            "sha256などでハッシュ化したもの (32byte) を表現する. 内部表現はとりあえず0-f長さ64の文字列",
          parameter: { _: "Nothing" },
        },
        {
          name: "List",
          description: "配列型. TypeScriptではReadonlyArrayとして扱う",
          parameter: { _: "Nothing" },
        },
        {
          name: "Dict",
          description: "辞書型. TypeScriptでは ReadonlyMapとして扱う",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    name: "String",
    description:
      "文字列. JavaScriptのstringで扱う. バイナリ形式はUTF-8. 不正な文字が入っている可能性がある",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "String" },
    id: d.String.typePartId,
  },
  {
    id: d.Account.typePartId,
    name: "Account",
    description:
      "ユーザー名. 表示される名前. 他のユーザーとかぶっても良い. 絵文字も使える. 全角英数は半角英数,半角カタカナは全角カタカナ, (株)の合字を分解するなどのNFKCの正規化がされる. U+0000-U+0019 と U+007F-U+00A0 の範囲の文字は入らない. 前後に空白を含められない. 間の空白は2文字以上連続しない. 文字数のカウント方法は正規化されたあとのCodePoint単位. Twitterと同じ, 1文字以上50文字以下",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "imageHash",
          description: "プロフィール画像",
          type: {
            typePartId: d.ImageHash.typePartId,
            parameter: [],
          },
        },
        {
          name: "introduction",
          description: "initMemberDescription",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "createTime",
          description: "Definyでユーザーが作成された日時",
          type: {
            typePartId: d.Time.typePartId,
            parameter: [],
          },
        },
        {
          name: "name",
          description:
            "アカウント名. 表示される名前. 他のユーザーとかぶっても良い. 絵文字も使える. 全角英数は半角英数,半角カタカナは全角カタカナ, (株)の合字を分解するなどのNFKCの正規化がされる. U+0000-U+0019 と U+007F-U+00A0 の範囲の文字は入らない. 前後に空白を含められない. 間の空白は2文字以上連続しない. 文字数のカウント方法は正規化されたあとのCodePoint単位. Twitterと同じ, 1文字以上50文字以下",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "id",
          description: "アカウントを識別するID",
          type: {
            typePartId: d.AccountId.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.StaticResourceState.typePartId,
    name: "StaticResourceState",
    description:
      "キーであるTokenによってデータが必ず1つに決まるもの. 絶対に更新されない. リソースがないということはデータが不正な状態になっているということ",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [{ name: "data", typePartId: staticResourceStateData }],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Loaded",
          description: "取得済み",
          parameter: {
            _: "Just",
            value: {
              typePartId: staticResourceStateData,
              parameter: [],
            },
          },
        },
        {
          name: "Unknown",
          description: "データを取得できなかった (サーバーの障害, オフライン)",
          parameter: { _: "Nothing" },
        },
        {
          name: "Loading",
          description: "indexedDBにアクセス中",
          parameter: { _: "Nothing" },
        },
        {
          name: "Requesting",
          description: "サーバに問い合わせ中",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.SetStatement.typePartId,
    name: "SetStatement",
    description: "代入文",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "target",
          description:
            "対象となる式. 指定の仕方によってはJSのSyntaxErrorになる",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "operatorMaybe",
          description: "演算子を=の左につける",
          type: {
            typePartId: d.Maybe.typePartId,
            parameter: [
              {
                typePartId: d.BinaryOperator.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "expr",
          description: "式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ParameterWithDocument.typePartId,
    name: "ParameterWithDocument",
    description:
      "ドキュメント付きの関数のパラメーター. パラメーター名, ドキュメント, 型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "パラメーター名",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "document",
          description: "ドキュメント",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "パラメーターの型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.TypePartId.typePartId,
    name: "TypePartId",
    description: "型パーツの識別子",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
  },
  {
    id: d.Result.typePartId,
    name: "Result",
    description:
      "成功と失敗を表す型. 今後はRustのstd::Resultに出力するために属性をつける?",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [
      { name: "ok", typePartId: resultOk },
      { name: "error", typePartId: resultError },
    ],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Ok",
          description: "成功",
          parameter: {
            _: "Just",
            value: {
              typePartId: resultOk,
              parameter: [],
            },
          },
        },
        {
          name: "Error",
          description: "失敗",
          parameter: {
            _: "Just",
            value: {
              typePartId: resultError,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.UrlData.typePartId,
    name: "UrlData",
    description:
      "言語とページの場所. URLとして表現されるデータ. Googleなどの検索エンジンの都合( https://support.google.com/webmasters/answer/182192?hl=ja )で,URLにページの言語を入れて,言語ごとに別のURLである必要がある.",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "location",
          description: "場所",
          type: {
            typePartId: d.Location.typePartId,
            parameter: [],
          },
        },
        {
          name: "language",
          description: "言語",
          type: {
            typePartId: d.Language.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.SwitchStatement.typePartId,
    name: "SwitchStatement",
    description: "switch文",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "switch(a) {} の a",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "patternList",
          description: 'case "text": { statementList }',
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsPattern.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.VariableDefinitionStatement.typePartId,
    name: "VariableDefinitionStatement",
    description: "ローカル変数定義",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "変数名",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "変数の型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
        {
          name: "expr",
          description: "式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "isConst",
          description: "constかどうか. falseはlet",
          type: {
            typePartId: d.Bool.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.CreateProjectParameter.typePartId,
    name: "CreateProjectParameter",
    description: "プロジェクト作成時に必要なパラメーター",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "accountToken",
          description: "プロジェクトを作るときのアカウント",
          type: {
            typePartId: d.AccountToken.typePartId,
            parameter: [],
          },
        },
        {
          name: "projectName",
          description: "プロジェクト名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Statement.typePartId,
    name: "Statement",
    description: "JavaScript の 文",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "EvaluateExpr",
          description: "式を評価する",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Set",
          description: "代入やプロパティの値を設定する",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.SetStatement.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "If",
          description: "if (condition) { thenStatementList }",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.IfStatement.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ThrowError",
          description: 'throw new Error("エラーメッセージ");',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Return",
          description: "return expr;",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ReturnVoid",
          description: "戻り値がvoidの関数を早く抜ける",
          parameter: { _: "Nothing" },
        },
        {
          name: "Continue",
          description: "forの繰り返しを次に進める",
          parameter: { _: "Nothing" },
        },
        {
          name: "VariableDefinition",
          description: "`const a: type_ = expr`\\nローカル変数の定義",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.VariableDefinitionStatement.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "FunctionDefinition",
          description:
            "`const name = (parameterList): returnType => { statementList }`\\nローカル関数の定義",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.FunctionDefinitionStatement.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "For",
          description: "for文. 繰り返し.",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ForStatement.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ForOf",
          description: "for文. 繰り返し.",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ForOfStatement.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "WhileTrue",
          description: "while (true) での無限ループ",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.Statement.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "Break",
          description: "whileのループから抜ける",
          parameter: { _: "Nothing" },
        },
        {
          name: "Switch",
          description: "switch文",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.SwitchStatement.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    name: "Time",
    description:
      "日時. `0001-01-01T00:00:00.000Z to 9999-12-31T23:59:59.999Z` 最小単位はミリ秒. ミリ秒の求め方は `day*1000*60*60*24 + millisecond`",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "day",
          description: "`1970-01-01` からの経過日数. マイナスになることもある",
          type: {
            typePartId: d.Int32.typePartId,
            parameter: [],
          },
        },
        {
          name: "millisecond",
          description: "日にちの中のミリ秒. `0 to 86399999 (=1000*60*60*24-1)`",
          type: {
            typePartId: d.Int32.typePartId,
            parameter: [],
          },
        },
      ],
    },
    id: d.Time.typePartId,
  },
  {
    id: d.AccountTokenAndProjectId.typePartId,
    name: "AccountTokenAndProjectId",
    description: "アカウントトークンとプロジェクトID",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "accountToken",
          description: "アカウントトークン",
          type: {
            typePartId: d.AccountToken.typePartId,
            parameter: [],
          },
        },
        {
          name: "projectId",
          description: "プロジェクトID",
          type: {
            typePartId: d.ProjectId.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ImportedVariable.typePartId,
    name: "ImportedVariable",
    description: "インポートした変数",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "moduleName",
          description:
            "モジュール名, 使うときにはnamedインポートされ, そのモジュール識別子は自動的につけられる",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "name",
          description: "変数名",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.OpenIdConnectProvider.typePartId,
    name: "OpenIdConnectProvider",
    description:
      '"ソーシャルログインを提供するプロバイダー (例: Google, GitHub)\n\nGitHub いらないかも (GitHubのアカウント作成するの分かりづらいので, 選択肢を減らしたい)',
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Google",
          description:
            "Google ( https://developers.google.com/identity/sign-in/web/ )",
          parameter: { _: "Nothing" },
        },
        {
          name: "GitHub",
          description:
            "GitHub ( https://developer.github.com/v3/guides/basics-of-authentication/ )",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.TypePart.typePartId,
    name: "TypePart",
    description: "型パーツ",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "型パーツの名前",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "description",
          description: "型パーツの説明",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "projectId",
          description: "所属しているプロジェクトのID",
          type: {
            typePartId: d.ProjectId.typePartId,
            parameter: [],
          },
        },
        {
          name: "attribute",
          description:
            "コンパイラに与える,この型を表現するのにどういう特殊な状態にするかという情報",
          type: {
            typePartId: d.Maybe.typePartId,
            parameter: [
              {
                typePartId: d.TypeAttribute.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "dataTypeParameterList",
          description: "型パラメーター",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TypeParameter.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "body",
          description: "定義本体",
          type: {
            typePartId: d.TypePartBody.typePartId,
            parameter: [],
          },
        },
        {
          name: "id",
          description: "型パーツを識別するID",
          type: {
            typePartId: d.TypePartId.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ProjectDataFile.typePartId,
    name: "ProjectDataFile",
    description:
      "プロジェクトのデータファイル\nパーツや,型パーツのデータが含まれている",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "id",
          description: "プロジェクトID",
          type: {
            typePartId: d.ProjectId.typePartId,
            parameter: [],
          },
        },
        {
          name: "name",
          description: "プロジェクト名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "typePartList",
          description: "型パーツの定義",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TypePart.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "partList",
          description: "パーツの定義",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Part.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    name: "TsExpr",
    description: "JavaScript の 式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "NumberLiteral",
          description: "数値リテラル `123`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.Int32.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "StringLiteral",
          description: '文字列リテラル `"text"`',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "BooleanLiteral",
          description: "booleanリテラル",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.Bool.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "NullLiteral",
          description: "`null`",
          parameter: { _: "Nothing" },
        },
        {
          name: "UndefinedLiteral",
          description: "`undefined`",
          parameter: { _: "Nothing" },
        },
        {
          name: "UnaryOperator",
          description: "単項演算子での式",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.UnaryOperatorExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "BinaryOperator",
          description: "2項演算子での式",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.BinaryOperatorExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ConditionalOperator",
          description: "条件演算子 `a ? b : c`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ConditionalOperatorExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ArrayLiteral",
          description: "配列リテラル `[1, 2, 3]`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.ArrayItem.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "ObjectLiteral",
          description: 'オブジェクトリテラル `{ data: 123, text: "sorena" }`',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.TsMember.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "Lambda",
          description: "ラムダ式 `() => {}`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.LambdaExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Variable",
          description: "変数. 変数が存在するかのチャックがされる",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsIdentifer.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "GlobalObjects",
          description: "グローバルオブジェクト",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsIdentifer.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "ImportedVariable",
          description: "インポートされた変数",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ImportedVariable.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Get",
          description: "プロパティの値を取得する `a.b a[12] data[f(2)]`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.GetExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Call",
          description: '関数を呼ぶ f(x)",',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.CallExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "New",
          description: "式からインスタンスを作成する `new Date()`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.CallExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "TypeAssertion",
          description: "型アサーション `a as string`",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TypeAssertion.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
    id: d.TsExpr.typePartId,
  },
  {
    id: d.ElmTuple2.typePartId,
    name: "ElmTuple2",
    description: "2つの要素のタプルの型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "first",
          description: "左の型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
        {
          name: "second",
          description: "右の型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Project.typePartId,
    name: "Project",
    description: "Definy の プロジェクト",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "プロジェクト名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "iconHash",
          description: "プロジェクトのアイコン画像",
          type: {
            typePartId: d.ImageHash.typePartId,
            parameter: [],
          },
        },
        {
          name: "imageHash",
          description: "initMemberDescription",
          type: {
            typePartId: d.ImageHash.typePartId,
            parameter: [],
          },
        },
        {
          name: "createTime",
          description: "initMemberDescription",
          type: {
            typePartId: d.Time.typePartId,
            parameter: [],
          },
        },
        {
          name: "createAccountId",
          description: "プロジェクトを作成したアカウント",
          type: {
            typePartId: d.AccountId.typePartId,
            parameter: [],
          },
        },
        {
          name: "updateTime",
          description: "更新日時",
          type: {
            typePartId: d.Time.typePartId,
            parameter: [],
          },
        },
        {
          name: "id",
          description: "プロジェクトを識別するID",
          type: {
            typePartId: d.ProjectId.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ForOfStatement.typePartId,
    name: "ForOfStatement",
    description: "forOf文",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "elementVariableName",
          description: "要素の変数名",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "iterableExpr",
          description: "繰り返す対象",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "statementList",
          description: "繰り返す文",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Statement.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.JsTsCode.typePartId,
    name: "JsTsCode",
    description:
      "TypeScriptやJavaScriptのコードを表現する. TypeScriptでも出力できるように型情報をつける必要がある",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "exportDefinitionList",
          description: "外部に公開する定義",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.ExportDefinition.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "statementList",
          description: "定義した後に実行するコード",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Statement.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.Member.typePartId,
    name: "Member",
    description: "直積型のメンバー",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "メンバー名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "description",
          description: "メンバーの説明",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "メンバー値の型",
          type: {
            typePartId: d.Type.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ElmExpr.typePartId,
    name: "ElmExpr",
    description: "Elm の 式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "StringLiteral",
          description: "文字列リテラル",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "IntLiteral",
          description: "整数リテラル",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.Int32.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "LocalVariant",
          description:
            "ファイル内で定義したバリアント. 値コンストラクタ. タグ.",
          parameter: { _: "Nothing" },
        },
        {
          name: "ImportedVariant",
          description: "インポートしたバリアント. 値コンストラクタ. タグ.",
          parameter: { _: "Nothing" },
        },
        {
          name: "List",
          description: "リストリテラル",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.List.typePartId,
              parameter: [
                {
                  typePartId: d.ElmExpr.typePartId,
                  parameter: [],
                },
              ],
            },
          },
        },
        {
          name: "Op",
          description: "????",
          parameter: { _: "Nothing" },
        },
        {
          name: "Negate",
          description: "単行マイナス",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Binops",
          description: "????",
          parameter: { _: "Nothing" },
        },
        {
          name: "Lambda",
          description: "ラムダ式. 関数リテラル",
          parameter: { _: "Nothing" },
        },
        {
          name: "Call",
          description: "関数呼び出し",
          parameter: { _: "Nothing" },
        },
        {
          name: "If",
          description: "if式. else ifも含めている",
          parameter: { _: "Nothing" },
        },
        {
          name: "Let",
          description: "let式. ローカル関数定義",
          parameter: { _: "Nothing" },
        },
        {
          name: "Case",
          description: "case式",
          parameter: { _: "Nothing" },
        },
        {
          name: "Accessor",
          description: "アクセサ .name メンバーを取得する関数",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Access",
          description: "user.name メンバー取得",
          parameter: { _: "Nothing" },
        },
        {
          name: "Update",
          description: '{ user | name = "新しい名前" }',
          parameter: { _: "Nothing" },
        },
        {
          name: "Record",
          description: 'レコード. { name = "名前", age = 20 }',
          parameter: { _: "Nothing" },
        },
        {
          name: "Unit",
          description: "Unit. ()",
          parameter: { _: "Nothing" },
        },
        {
          name: "Tuple2",
          description: '2つの要素のタプル. (1, "あ")',
          parameter: { _: "Nothing" },
        },
        {
          name: "Tuple3",
          description: '3つの要素のタプル. (1, "い", 3)',
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.FunctionType.typePartId,
    name: "FunctionType",
    description: "関数の型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsIdentifer.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "parameterList",
          description: "パラメーターの型. 意味のない引数名は適当に付く",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsType.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "return",
          description: "戻り値の型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Tuple2.typePartId,
    name: "Tuple2",
    description: "2つの値を持つ型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [
      { name: "first", typePartId: tuple2First },
      { name: "second", typePartId: tuple2Second },
    ],
    body: {
      _: "Product",
      memberList: [
        {
          name: "first",
          description: "0番目の値",
          type: {
            typePartId: tuple2First,
            parameter: [],
          },
        },
        {
          name: "second",
          description: "1番目の値",
          type: {
            typePartId: tuple2Second,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ElmCustomType.typePartId,
    name: "ElmCustomType",
    description: "カスタム型. 代数的データ型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "カスタム型名",
          type: {
            typePartId: d.ElmTypeName.typePartId,
            parameter: [],
          },
        },
        {
          name: "export",
          description: "外部に公開するレベル",
          type: {
            typePartId: d.ElmCustomTypeExportLevel.typePartId,
            parameter: [],
          },
        },
        {
          name: "comment",
          description: "コメント",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "parameter",
          description: "型パラメーター",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.String.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "variantList",
          description: "バリアントのリスト. 値コンストラクタ. タグ",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.ElmVariant.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.CallExpr.typePartId,
    name: "CallExpr",
    description: "式と呼ぶパラメーター",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "呼ばれる式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "parameterList",
          description: "パラメーター",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsExpr.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.Variable.typePartId,
    name: "Variable",
    description: "",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "変数の名前",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "document",
          description: "ドキュメント",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "変数の型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
        {
          name: "expr",
          description: "変数の式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.KernelCall.typePartId,
    name: "KernelCall",
    description: "複数の引数が必要な内部関数の部分呼び出し",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "kernel",
          description: "関数",
          type: {
            typePartId: d.KernelExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "expr",
          description: "呼び出すパラメーター",
          type: {
            typePartId: d.EvaluatedExpr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.GetExpr.typePartId,
    name: "GetExpr",
    description: "プロパティアクセス",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "propertyExpr",
          description: "プロパティの式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ImportedType.typePartId,
    name: "ImportedType",
    description: "インポートされた型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "moduleName",
          description:
            "モジュール名. namedImportされるがその識別子は自動的に作成される",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "name",
          description: "型の名前",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.AccountTokenHash.typePartId,
    name: "AccountTokenHash",
    description: "アカウントトークンのハッシュ値. データベースに保存する用",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Token" },
  },
  {
    id: d.KernelExpr.typePartId,
    name: "KernelExpr",
    description: "Definyだけでは表現できない式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Int32Add",
          description: "32bit整数を足す関数",
          parameter: { _: "Nothing" },
        },
        {
          name: "Int32Sub",
          description: "32bit整数を引く関数",
          parameter: { _: "Nothing" },
        },
        {
          name: "Int32Mul",
          description: "32bit整数をかける関数",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.ProjectDataFileHashValue.typePartId,
    name: "ProjectDataFileHashValue",
    description:
      "プロジェクトデータファイルのハッシュ値\nCloud Storage に保存するときのファイル名",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Token" },
  },
  {
    id: d.Location.typePartId,
    name: "Location",
    description:
      "DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Home",
          description: "最初のページ",
          parameter: { _: "Nothing" },
        },
        {
          name: "CreateProject",
          description: "プロジェクト作成画面",
          parameter: { _: "Nothing" },
        },
        {
          name: "Project",
          description: "プロジェクトの詳細ページ",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ProjectId.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Account",
          description: "アカウント詳細ページ",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.AccountId.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Setting",
          description: "設定ページ",
          parameter: { _: "Nothing" },
        },
        {
          name: "About",
          description: "Definyについて説明したページ",
          parameter: { _: "Nothing" },
        },
        {
          name: "TypePart",
          description: "型パーツ編集ページ",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TypePartId.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Part",
          description: "パーツ編集ページ",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.PartId.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.TypeAlias.typePartId,
    name: "TypeAlias",
    description: "TypeAlias. `export type T = {}`",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "型の名前",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsIdentifer.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "document",
          description: "ドキュメント",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "型本体",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    name: "AccountId",
    description: "アカウントを識別するためのID",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
    id: d.AccountId.typePartId,
  },
  {
    id: d.KeyValue.typePartId,
    name: "KeyValue",
    description: "文字列のkeyと式のvalue",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "key",
          description: "key",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "value",
          description: "value",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.List.typePartId,
    name: "List",
    description: "リスト. JavaScriptのArrayで扱う",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [
      {
        name: "element",
        typePartId: d.TypePartId.fromString("91b5185b554cf5ab00c5dae0ae9eafac"),
      },
    ],
    body: { _: "Kernel", typePartBodyKernel: "List" },
  },
  {
    id: d.LogInState.typePartId,
    name: "LogInState",
    description: "definy.app の ログイン状態",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "LoadingAccountTokenFromIndexedDB",
          description: "アカウントトークンをindexedDBから読み取っている状態",
          parameter: { _: "Nothing" },
        },
        {
          name: "Guest",
          description: "ログインしていない状態",
          parameter: { _: "Nothing" },
        },
        {
          name: "RequestingLogInUrl",
          description: "ログインへの画面URLをリクエストした状態",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.OpenIdConnectProvider.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "JumpingToLogInPage",
          description: "ログインURLを受け取り,ログイン画面へ移行中",
          parameter: { _: "Nothing" },
        },
        {
          name: "VerifyingAccountToken",
          description:
            "アカウントトークンの検証とログインしているユーザーの情報を取得している状態",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.AccountToken.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "LoggedIn",
          description: "ログインしている状態",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.AccountTokenAndUserId.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.ForStatement.typePartId,
    name: "ForStatement",
    description: "for文",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "counterVariableName",
          description: "カウンタ変数名",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "untilExpr",
          description: "ループの上限の式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "statementList",
          description: "繰り返す文",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Statement.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.TsMemberType.typePartId,
    name: "TsMemberType",
    description: "オブジェクトのメンバーの型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "プロパティ名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "required",
          description: "必須かどうか falseの場合 ? がつく",
          type: {
            typePartId: d.Bool.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
        {
          name: "document",
          description: "ドキュメント",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ConditionalOperatorExpr.typePartId,
    name: "ConditionalOperatorExpr",
    description: "条件演算子",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "condition",
          description: "条件の式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "thenExpr",
          description: "条件がtrueのときに評価される式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "elseExpr",
          description: "条件がfalseのときに評価される式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.IfStatement.typePartId,
    name: "IfStatement",
    description: "if文",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "condition",
          description: "条件の式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "thenStatementList",
          description: "条件がtrueのときに実行する文",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Statement.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.ElmFieldName.typePartId,
    name: "ElmFieldName",
    description: "フィールド名",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "FieldName",
          description:
            '**直接 FieldName.FieldName("name") と指定してはいけない!! Elmの識別子として使える文字としてチェックできないため**',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.ElmVariantName.typePartId,
    name: "ElmVariantName",
    description: "バリアント名",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "VariantName",
          description:
            '**直接 VariantName.VariantName("Loading") と指定してはいけない!! Elmの識別子として使える文字としてチェックできないため**',
          parameter: {
            _: "Just",
            value: {
              typePartId: d.String.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.IntersectionType.typePartId,
    name: "IntersectionType",
    description: "交差型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "left",
          description: "左に指定する型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
        {
          name: "right",
          description: "右に指定する型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Part.typePartId,
    name: "Part",
    description: "パーツの定義. 他のプログラミング言語でいう関数や, 変数のこと",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "パーツの名前",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "description",
          description: "パーツの説明",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "パーツの型",
          type: {
            typePartId: d.Type.typePartId,
            parameter: [],
          },
        },
        {
          name: "expr",
          description: "パーツの式",
          type: {
            typePartId: d.Expr.typePartId,
            parameter: [],
          },
        },
        {
          name: "projectId",
          description: "所属しているプロジェクトのID",
          type: {
            typePartId: d.ProjectId.typePartId,
            parameter: [],
          },
        },
        {
          name: "id",
          description: "パーツを識別するID",
          type: {
            typePartId: d.PartId.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.EvaluatedExpr.typePartId,
    name: "EvaluatedExpr",
    description: "Definyの評価しきった式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Kernel",
          description: "Definyだけでは表現できない式",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.KernelExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Int32",
          description: "32bit整数",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.Int32.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "TagReference",
          description: "タグを参照",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TagReference.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "KernelCall",
          description: "内部関数呼び出し",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.KernelCall.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.SetTypePartParameter.typePartId,
    name: "SetTypePartParameter",
    description:
      "# 型の変更が必要\n\nhttps://www.notion.so/setTypePart-definy-app-api-a2500046da77432796b7ccaab6e4e3ee\n\n1つの型パーツを保存するために指定するパラメーター\n",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "accountToken",
          description: "アカウントトークン",
          type: {
            typePartId: d.AccountToken.typePartId,
            parameter: [],
          },
        },
        {
          name: "typePartId",
          description: "型パーツのID",
          type: {
            typePartId: d.TypePartId.typePartId,
            parameter: [],
          },
        },
        {
          name: "name",
          description: "設定する型パーツ名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "description",
          description: "設定する説明文",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "attribute",
          description: "設定する属性",
          type: {
            typePartId: d.Maybe.typePartId,
            parameter: [
              {
                typePartId: d.TypeAttribute.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "typeParameterList",
          description: "設定する型パラメーター",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TypeParameter.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "body",
          description: "設定する型定義本体",
          type: {
            typePartId: d.TypePartBody.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    name: "Bool",
    description:
      "Bool. 真か偽. JavaScriptのbooleanで扱える. true: 1, false: 0. (1byte)としてバイナリに変換する",
    projectId: coreProjectId,
    attribute: { _: "Just", value: "AsBoolean" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "False",
          description: "偽",
          parameter: { _: "Nothing" },
        },
        {
          name: "True",
          description: "真",
          parameter: { _: "Nothing" },
        },
      ],
    },
    id: d.Bool.typePartId,
  },
  {
    id: d.ElmDefinition.typePartId,
    name: "ElmDefinition",
    description: "Elmの関数の定義. 引数がない関数(定数)も含まれる",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "関数名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "type",
          description: "型",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
        {
          name: "expr",
          description: "式",
          type: {
            typePartId: d.ElmType.typePartId,
            parameter: [],
          },
        },
        {
          name: "comment",
          description: "コメント",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Function.typePartId,
    name: "Function",
    description: "外部に公開する関数",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "外部に公開する関数の名前",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "document",
          description: "ドキュメント",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsIdentifer.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "parameterList",
          description: "パラメーター",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.ParameterWithDocument.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "returnType",
          description: "戻り値の型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
        {
          name: "statementList",
          description: "関数の本体",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Statement.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    name: "AccountToken",
    description:
      "アカウントトークン. アカウントトークンを持っていればアクセストークンをDefinyのサーバーにリクエストした際に得られるIDのアカウントを保有していると証明できる. サーバーにハッシュ化したものを保存している. これが盗まれた場合,不正に得た人はアカウントを乗っ取ることができる. 有効期限はなし, 最後に発行したアカウントトークン以外は無効になる",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Token" },
    id: d.AccountToken.typePartId,
  },
  {
    id: d.FunctionDefinitionStatement.typePartId,
    name: "FunctionDefinitionStatement",
    description: "ローカル関数定義",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "変数名",
          type: {
            typePartId: d.TsIdentifer.typePartId,
            parameter: [],
          },
        },
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsIdentifer.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "parameterList",
          description: "パラメーターのリスト",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.ParameterWithDocument.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "returnType",
          description: "戻り値の型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
        {
          name: "statementList",
          description: "関数本体",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Statement.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.Pattern.typePartId,
    name: "Pattern",
    description: "直積型のパターン",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "タグ名",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "description",
          description: "パターンの説明",
          type: {
            typePartId: d.String.typePartId,
            parameter: [],
          },
        },
        {
          name: "parameter",
          description: "そのパターンにつけるデータの型",
          type: {
            typePartId: d.Maybe.typePartId,
            parameter: [
              {
                typePartId: d.Type.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.ImageHash.typePartId,
    name: "ImageHash",
    description:
      "画像から求められるトークン.キャッシュのキーとして使われる.1つのトークンに対して永久に1つの画像データしか表さない. キャッシュを更新する必要はない",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Token" },
  },
  {
    id: d.Expr.typePartId,
    name: "Expr",
    description: "Definy の 式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Kernel",
          description: "Definyだけでは表現できない式",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.KernelExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "Int32Literal",
          description: "32bit整数",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.Int32.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "PartReference",
          description: "パーツの値を参照",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.PartId.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "TagReference",
          description: "タグを参照",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TagReference.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "FunctionCall",
          description: "関数呼び出し",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.FunctionCall.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.TagReference.typePartId,
    name: "TagReference",
    description: "タグの参照を表す",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "typePartId",
          description: "型ID. タグIDがあれば, 型を導出できそうだが……",
          type: {
            typePartId: d.TypePartId.typePartId,
            parameter: [],
          },
        },
        {
          name: "tagId",
          description: "タグID",
          type: {
            typePartId: d.TagId.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.Mode.typePartId,
    name: "Mode",
    description:
      "definy.app を開発する上での動作モード. デベロップモード(http://localhost:2520)か, リリースモード(https://definy.app)",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Develop",
          description:
            "ローカルで開発するときのモード. オリジンは http://localshot:2520",
          parameter: { _: "Nothing" },
        },
        {
          name: "Release",
          description: "リリースモード. オリジンは https://definy.app",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.BinaryOperatorExpr.typePartId,
    name: "BinaryOperatorExpr",
    description: "2項演算子と左右の式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "operator",
          description: "2項演算子",
          type: {
            typePartId: d.BinaryOperator.typePartId,
            parameter: [],
          },
        },
        {
          name: "left",
          description: "左の式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
        {
          name: "right",
          description: "右の式",
          type: {
            typePartId: d.TsExpr.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.CodeType.typePartId,
    name: "CodeType",
    description: "出力するコードの種類",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "JavaScript",
          description: "JavaScript",
          parameter: { _: "Nothing" },
        },
        {
          name: "TypeScript",
          description: "TypeScript",
          parameter: { _: "Nothing" },
        },
      ],
    },
  },
  {
    id: d.LambdaExpr.typePartId,
    name: "LambdaExpr",
    description: "ラムダ式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "parameterList",
          description: "パラメーターのリスト",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Parameter.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.TsIdentifer.typePartId,
                parameter: [],
              },
            ],
          },
        },
        {
          name: "returnType",
          description: "戻り値の型",
          type: {
            typePartId: d.TsType.typePartId,
            parameter: [],
          },
        },
        {
          name: "statementList",
          description: "ラムダ式本体",
          type: {
            typePartId: d.List.typePartId,
            parameter: [
              {
                typePartId: d.Statement.typePartId,
                parameter: [],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: d.RequestLogInUrlRequestData.typePartId,
    name: "RequestLogInUrlRequestData",
    description: "ログインのURLを発行するために必要なデータ",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "openIdConnectProvider",
          description: "ログインに使用するプロバイダー",
          type: {
            typePartId: d.OpenIdConnectProvider.typePartId,
            parameter: [],
          },
        },
        {
          name: "urlData",
          description: "ログインした後に返ってくるURLに必要なデータ",
          type: {
            typePartId: d.UrlData.typePartId,
            parameter: [],
          },
        },
      ],
    },
  },
  {
    id: d.ElmTypeDeclaration.typePartId,
    name: "ElmTypeDeclaration",
    description: "Elmの型定義",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "TypeAlias",
          description: "型エイリアス. レコード型に名前を付ける",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmTypeAlias.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "CustomType",
          description: "カスタム型. 代数的データ型",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.ElmCustomType.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.TsMember.typePartId,
    name: "TsMember",
    description: "JavaScriptのオブジェクトリテラルの要素",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    typeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Spread",
          description: "...a のようにする",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.TsExpr.typePartId,
              parameter: [],
            },
          },
        },
        {
          name: "KeyValue",
          description: "a: b のようにする",
          parameter: {
            _: "Just",
            value: {
              typePartId: d.KeyValue.typePartId,
              parameter: [],
            },
          },
        },
      ],
    },
  },
  {
    id: d.Type.typePartId,
    name: "Type",
    description: "Definy の型",
    attribute: d.Maybe.Nothing(),
    projectId: coreProjectId,
    typeParameterList: [],
    body: d.TypePartBody.Product([
      {
        name: "typePartId",
        description: "型パーツID",
        type: {
          typePartId: d.TypePartId.typePartId,
          parameter: [],
        },
      },
      {
        name: "parameter",
        description: "パラメーター",
        type: {
          typePartId: d.List.typePartId,
          parameter: [
            {
              typePartId: d.Type.typePartId,
              parameter: [],
            },
          ],
        },
      },
    ]),
  },
  {
    id: d.TypeParameter.typePartId,
    name: "TypeParameter",
    description: "型パラメータに指定するもの",
    attribute: d.Maybe.Nothing(),
    body: d.TypePartBody.Product([
      {
        name: "name",
        description: "パラメーター名",
        type: {
          typePartId: d.String.typePartId,
          parameter: [],
        },
      },
      {
        name: "typePartId",
        description: "型パラメーターの型ID",
        type: {
          typePartId: d.TypePartId.typePartId,
          parameter: [],
        },
      },
    ]),
    projectId: coreProjectId,
    typeParameterList: [],
  },
];

fileSystem.writeFile(
  "localData.ts",
  generateTypeScriptCodeAsString(
    new Map(typePartList.map((typePart) => [typePart.id, typePart]))
  )
);
