import * as d from "./localData";
import { generateTypeScriptCode } from "./core/main";
import { jsTs } from "./gen/main";

const coreProjectId: d.ProjectId = d.ProjectId.fromString(
  "96deb95f697e66f12a55e4d3910ea509"
);

const noArgumentsType = (typePartId: d.TypePartId): d.Type => ({
  input: d.Maybe.Nothing(),
  output: d.DataTypeOrDataTypeParameter.DataType({ typePartId, arguments: [] }),
});
const listType = (typePartId: d.TypePartId): d.Type => ({
  input: d.Maybe.Nothing(),
  output: d.DataTypeOrDataTypeParameter.DataType({
    typePartId: d.List.typePartId,
    arguments: [
      d.DataTypeOrDataTypeParameter.DataType({
        typePartId,
        arguments: [],
      }),
    ],
  }),
});
const maybeType = (typePartId: d.TypePartId): d.Type => ({
  input: d.Maybe.Nothing(),
  output: d.DataTypeOrDataTypeParameter.DataType({
    typePartId: d.Maybe.typePartId,
    arguments: [
      d.DataTypeOrDataTypeParameter.DataType({
        typePartId,
        arguments: [],
      }),
    ],
  }),
});

const typePartList: ReadonlyArray<d.TypePart> = [
  {
    id: d.ElmVariant.typePartId,
    name: "ElmVariant",
    description: "バリアント. 値コンストラクタ. タグ",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: d.TypePartBody.Product([
      {
        name: "name",
        description: "バリアント名",
        type: noArgumentsType(d.ElmVariantName.typePartId),
      },
      {
        name: "parameter",
        description: "パラメーター",
        type: listType(d.ElmType.typePartId),
      },
    ]),
  },
  {
    id: d.ExportDefinition.typePartId,
    name: "ExportDefinition",
    description: "外部に公開する定義",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: d.TypePartBody.Sum([
      {
        name: "TypeAlias",
        description: "TypeAlias",
        parameter: d.Maybe.Just<d.Type>(
          noArgumentsType(d.TypeAlias.typePartId)
        ),
      },
      {
        name: "Function",
        description: "Function",
        parameter: d.Maybe.Just<d.Type>(noArgumentsType(d.Function.typePartId)),
      },
      {
        name: "Variable",
        description: "Variable",
        parameter: d.Maybe.Just(noArgumentsType(d.Variable.typePartId)),
      },
    ]),
  },
  {
    id: d.UnaryOperatorExpr.typePartId,
    name: "UnaryOperatorExpr",
    description: "単項演算子と適用される式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "operator",
          description: "単項演算子",
          type: noArgumentsType(d.UnaryOperator.typePartId),
        },
        {
          name: "expr",
          description: "適用される式",
          type: noArgumentsType(d.TsExpr.typePartId),
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
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
  },
  {
    id: d.Language.typePartId,
    name: "Language",
    description:
      "英語,日本語,エスペラント語\n\nナルミンチョが使える? プログラミングじゃない言語",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "ElmTypeName",
          description:
            '**直接 ElmTypeName.ElmTypeName("Int") と指定してはいけない!! Elmの識別子として使える文字としてチェックできないため**',
          parameter: {
            _: "Just",
            value: noArgumentsType(d.String.typePartId),
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
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Int32" },
  },
  {
    id: d.ElmType.typePartId,
    name: "ElmType",
    description: "Elm の 型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "ImportedType",
          description: "インポートした型",
          parameter: d.Maybe.Just(
            noArgumentsType(d.ElmImportedType.typePartId)
          ),
        },
        {
          name: "TypeParameter",
          description: "型パラメーター",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.String.typePartId),
          },
        },
        {
          name: "Function",
          description: "関数",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ElmFunctionType.typePartId),
          },
        },
        {
          name: "List",
          description: "List リスト",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ElmType.typePartId),
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
            value: noArgumentsType(d.ElmTuple2.typePartId),
          },
        },
        {
          name: "Tuple3",
          description: "(a, b, c)",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ElmTuple3.typePartId),
          },
        },
        {
          name: "Record",
          description: "{ name: String, age: Int } レコード型",
          parameter: {
            _: "Just",
            value: listType(d.ElmField.typePartId),
          },
        },
        {
          name: "LocalType",
          description: "モジュール内にある型",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ElmLocalType.typePartId),
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
    dataTypeParameterList: [],
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
            value: listType(d.TsMemberType.typePartId),
          },
        },
        {
          name: "Function",
          description: "関数 `(parameter: parameter) => returnType`",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.FunctionType.typePartId),
          },
        },
        {
          name: "WithTypeParameter",
          description:
            "型パラメータ付きの型 `Promise<number>` `ReadonlyArray<string>`",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TsTypeWithTypeParameter.typePartId),
          },
        },
        {
          name: "Union",
          description: "ユニオン型 `a | b`",
          parameter: {
            _: "Just",
            value: listType(d.TsType.typePartId),
          },
        },
        {
          name: "Intersection",
          description: '"交差型 `left & right`',
          parameter: {
            _: "Just",
            value: noArgumentsType(d.IntersectionType.typePartId),
          },
        },
        {
          name: "ImportedType",
          description: "インポートされた外部の型",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ImportedType.typePartId),
          },
        },
        {
          name: "ScopeInFile",
          description: "ファイル内で定義された型",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TsIdentifier.typePartId),
          },
        },
        {
          name: "ScopeInGlobal",
          description: "グローバル空間の型",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TsIdentifier.typePartId),
          },
        },
        {
          name: "StringLiteral",
          description: "文字列リテラル型",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.String.typePartId),
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
    dataTypeParameterList: [
      {
        name: "data",
        description: "リソースに含めるのデータ型",
      },
    ],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Loaded",
          description: "読み込み済み",
          parameter: d.Maybe.Just({
            input: d.Maybe.Nothing(),
            output: d.DataTypeOrDataTypeParameter.DataType({
              typePartId: d.WithTime.typePartId,
              arguments: [d.DataTypeOrDataTypeParameter.DataTypeParameter(0)],
            }),
          }),
        },
        {
          name: "Deleted",
          description: "削除されたか, 存在しない",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.Time.typePartId),
          },
        },
        {
          name: "Unknown",
          description: "削除されたか, 存在しない",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.Time.typePartId),
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
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: d.TypePartBody.Sum([
      {
        name: "AsBoolean",
        description:
          "JavaScript, TypeScript で boolean として扱うように指示する. 定義が2つのパターンで両方パラメーターなし false, trueの順である必要がある",
        parameter: d.Maybe.Nothing(),
      },
      {
        name: "AsUndefined",
        description:
          "JavaScript, TypeScript で undefined として扱うように指示する. 定義が1つのパターンでパラメーターなしである必要がある",
        parameter: d.Maybe.Nothing(),
      },
      {
        name: "AsNumber",
        description:
          "JavaScript, TypeScript で number & {_typeName: never} として扱うように指示する. 定義が1つのパターンでパラメーターが Int32 である必要がある",
        parameter: d.Maybe.Nothing(),
      },
    ]),
  },
  {
    id: d.ElmField.typePartId,
    name: "ElmField",
    description: "",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "フィールド名",
          type: noArgumentsType(d.ElmFieldName.typePartId),
        },
        {
          name: "type",
          description: "型",
          type: noArgumentsType(d.ElmType.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "type",
          description: "パラメーターをつけられる型",
          type: noArgumentsType(d.TsType.typePartId),
        },
        {
          name: "typeParameterList",
          description:
            "パラメーターに指定する型. なにも要素を入れなけければ T<>ではなく T の形式で出力される",
          type: listType(d.TsType.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "NeedPartDefinition",
          description: "式を評価するには,このパーツの定義が必要だと言っている",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.PartId.typePartId),
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
            value: noArgumentsType(d.String.typePartId),
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
    id: d.TsIdentifier.typePartId,
    name: "TsIdentifier",
    description: "TypeScriptの識別子として使える文字",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Identifier",
          description:
            '**直接 TsIdentifier.Identifier("name") と指定してはいけない!! TypeScriptの識別子として使える文字としてチェックできないため**',
          parameter: d.Maybe.Just(noArgumentsType(d.String.typePartId)),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "typeName",
          description: "型名",
          type: noArgumentsType(d.ElmTypeName.typePartId),
        },
        {
          name: "parameter",
          description: "型パラメーター",
          type: listType(d.ElmType.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "function",
          description: "関数",
          type: noArgumentsType(d.Expr.typePartId),
        },
        {
          name: "parameter",
          description: "パラメーター",
          type: noArgumentsType(d.Expr.typePartId),
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
    dataTypeParameterList: [
      { name: "value", description: "Just のときに指定するデータ型" },
    ],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Just",
          description: "値があるということ",
          parameter: d.Maybe.Just({
            input: d.Maybe.Nothing(),
            output: d.DataTypeOrDataTypeParameter.DataTypeParameter(0),
          }),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "spread",
          description: "スプレッド ...a のようにするか",
          type: noArgumentsType(d.Bool.typePartId),
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
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Binary" },
  },
  {
    id: d.ElmTuple3.typePartId,
    name: "ElmTuple3",
    description: "3つの要素のタプルの型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "first",
          description: "左の型",
          type: noArgumentsType(d.ElmType.typePartId),
        },
        {
          name: "second",
          description: "真ん中の型",
          type: noArgumentsType(d.ElmType.typePartId),
        },
        {
          name: "third",
          description: "右の型",
          type: noArgumentsType(d.ElmType.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "moduleName",
          description: "モジュール名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "typeName",
          description: "型名",
          type: noArgumentsType(d.ElmTypeName.typePartId),
        },
        {
          name: "parameter",
          description: "型パラメーター",
          type: listType(d.ElmType.typePartId),
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
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "型アサーションを受ける式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "type",
          description: "型",
          type: noArgumentsType(d.TsType.typePartId),
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
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Product",
          description: "直積型",
          parameter: d.Maybe.Just(listType(d.Member.typePartId)),
        },
        {
          name: "Sum",
          description: "直和型",
          parameter: d.Maybe.Just(listType(d.Pattern.typePartId)),
        },
        {
          name: "Kernel",
          description: "definyだけでは表現できないデータ型",
          parameter: d.Maybe.Just(
            noArgumentsType(d.TypePartBodyKernel.typePartId)
          ),
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
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "パラメーター名",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "type",
          description: "パラメーターの型",
          type: noArgumentsType(d.TsType.typePartId),
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
    dataTypeParameterList: [
      {
        name: "key",
        description: "辞書のキーとなるデータタイプ",
      },
      {
        name: "value",
        description: "辞書のvalueとなるデータタイプ",
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
    dataTypeParameterList: [
      { name: "data", description: "任意のデータタイプ" },
    ],
    body: {
      _: "Product",
      memberList: [
        {
          name: "getTime",
          description: "データベースから取得した日時",
          type: noArgumentsType(d.Time.typePartId),
        },
        {
          name: "data",
          description: "データ",
          type: {
            input: d.Maybe.Nothing(),
            output: d.DataTypeOrDataTypeParameter.DataTypeParameter(0),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "型エイリアス名",
          type: noArgumentsType(d.ElmTypeName.typePartId),
        },
        {
          name: "export",
          description: "外部に公開するか",
          type: noArgumentsType(d.Bool.typePartId),
        },
        {
          name: "comment",
          description: "コメント",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "parameter",
          description: "型パラメーター",
          type: listType(d.String.typePartId),
        },
        {
          name: "type",
          description: "別名を付ける型",
          type: noArgumentsType(d.ElmType.typePartId),
        },
      ],
    },
  },
  {
    name: "PartId",
    description: "パーツの識別子",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
    id: d.PartId.typePartId,
  },
  {
    id: d.AccountTokenAccountId.typePartId,
    name: "AccountTokenAccountId",
    description: "AccountToken と AccountId",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "accountToken",
          description: "accountToken",
          type: noArgumentsType(d.AccountToken.typePartId),
        },
        {
          name: "accountId",
          description: "accountId",
          type: noArgumentsType(d.AccountId.typePartId),
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
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
  },
  {
    id: d.ElmFunctionType.typePartId,
    name: "ElmFunctionType",
    description: "関数の型. 入力と出力",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "input",
          description: "入力の型",
          type: noArgumentsType(d.ElmType.typePartId),
        },
        {
          name: "output",
          description: "出力の型",
          type: noArgumentsType(d.ElmType.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "caseString",
          description: "case に使う文字列",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "statementList",
          description: "マッチしたときに実行する部分",
          type: listType(d.Statement.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "moduleName",
          description: "モジュール名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "typeDeclarationList",
          description: "型定義",
          type: listType(d.ElmTypeDeclaration.typePartId),
        },
      ],
    },
  },
  {
    id: d.TypePartBodyKernel.typePartId,
    name: "TypePartBodyKernel",
    description: "definyだけでは表現できないデータ型",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: d.TypePartBody.Sum([
      {
        name: "Int32",
        description: "32bit整数",
        parameter: { _: "Nothing" },
      },
      {
        name: "String",
        description: "文字列",
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
    ]),
  },
  {
    name: "String",
    description:
      "文字列. JavaScriptのstringで扱う. バイナリ形式はUTF-8. 不正な文字が入っている可能性がある",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "imageHash",
          description: "プロフィール画像",
          type: noArgumentsType(d.ImageHash.typePartId),
        },
        {
          name: "introduction",
          description: "initMemberDescription",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "createTime",
          description: "definyでユーザーが作成された日時",
          type: noArgumentsType(d.Time.typePartId),
        },
        {
          name: "name",
          description:
            "アカウント名. 表示される名前. 他のユーザーとかぶっても良い. 絵文字も使える. 全角英数は半角英数,半角カタカナは全角カタカナ, (株)の合字を分解するなどのNFKCの正規化がされる. U+0000-U+0019 と U+007F-U+00A0 の範囲の文字は入らない. 前後に空白を含められない. 間の空白は2文字以上連続しない. 文字数のカウント方法は正規化されたあとのCodePoint単位. Twitterと同じ, 1文字以上50文字以下",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "id",
          description: "アカウントを識別するID",
          type: noArgumentsType(d.AccountId.typePartId),
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
    dataTypeParameterList: [
      { name: "data", description: "リソースに含めるデータタイプ" },
    ],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Loaded",
          description: "取得済み",
          parameter: {
            _: "Just",
            value: {
              input: d.Maybe.Nothing(),
              output: d.DataTypeOrDataTypeParameter.DataTypeParameter(0),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "target",
          description:
            "対象となる式. 指定の仕方によってはJSのSyntaxErrorになる",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "operatorMaybe",
          description: "演算子を=の左につける",
          type: maybeType(d.BinaryOperator.typePartId),
        },
        {
          name: "expr",
          description: "式",
          type: noArgumentsType(d.TsExpr.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "パラメーター名",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "document",
          description: "ドキュメント",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "type",
          description: "パラメーターの型",
          type: noArgumentsType(d.TsType.typePartId),
        },
      ],
    },
  },
  {
    id: d.TypePartId.typePartId,
    name: "TypePartId",
    description:
      "型パーツの識別子. データ型パラメータが含まれることはなくなった",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
  },
  {
    id: d.Result.typePartId,
    name: "Result",
    description:
      "成功と失敗を表す型. 今後はRustのstd::Resultに出力するために属性をつける?",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [
      { name: "ok", description: "okなときのデータタイプ" },
      { name: "error", description: "errorなときのデータタイプ" },
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
              input: d.Maybe.Nothing(),
              output: d.DataTypeOrDataTypeParameter.DataTypeParameter(0),
            },
          },
        },
        {
          name: "Error",
          description: "失敗",
          parameter: {
            _: "Just",
            value: {
              input: d.Maybe.Nothing(),
              output: d.DataTypeOrDataTypeParameter.DataTypeParameter(1),
            },
          },
        },
      ],
    },
  },
  {
    id: d.LocationAndLanguage.typePartId,
    name: "LocationAndLanguage",
    description: "言語とページの場所. URLとして表現されるデータ",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "location",
          description: "場所",
          type: noArgumentsType(d.Location.typePartId),
        },
        {
          name: "language",
          description: "言語",
          type: noArgumentsType(d.Language.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "switch(a) {} の a",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "patternList",
          description: 'case "text": { statementList }',
          type: listType(d.TsPattern.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "変数名",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "type",
          description: "変数の型",
          type: noArgumentsType(d.TsType.typePartId),
        },
        {
          name: "expr",
          description: "式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "isConst",
          description: "constかどうか. falseはlet",
          type: noArgumentsType(d.Bool.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "accountToken",
          description: "プロジェクトを作るときのアカウント",
          type: noArgumentsType(d.AccountToken.typePartId),
        },
        {
          name: "projectName",
          description: "プロジェクト名",
          type: noArgumentsType(d.String.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "EvaluateExpr",
          description: "式を評価する",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TsExpr.typePartId),
          },
        },
        {
          name: "Set",
          description: "代入やプロパティの値を設定する",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.SetStatement.typePartId),
          },
        },
        {
          name: "If",
          description: "if (condition) { thenStatementList }",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.IfStatement.typePartId),
          },
        },
        {
          name: "ThrowError",
          description: 'throw new Error("エラーメッセージ");',
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TsExpr.typePartId),
          },
        },
        {
          name: "Return",
          description: "return expr;",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TsExpr.typePartId),
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
            value: noArgumentsType(d.VariableDefinitionStatement.typePartId),
          },
        },
        {
          name: "FunctionDefinition",
          description:
            "`const name = (parameterList): returnType => { statementList }`\\nローカル関数の定義",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.FunctionDefinitionStatement.typePartId),
          },
        },
        {
          name: "For",
          description: "for文. 繰り返し.",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ForStatement.typePartId),
          },
        },
        {
          name: "ForOf",
          description: "for文. 繰り返し.",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ForOfStatement.typePartId),
          },
        },
        {
          name: "WhileTrue",
          description: "while (true) での無限ループ",
          parameter: {
            _: "Just",
            value: listType(d.Statement.typePartId),
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
            value: noArgumentsType(d.SwitchStatement.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "day",
          description: "`1970-01-01` からの経過日数. マイナスになることもある",
          type: noArgumentsType(d.Int32.typePartId),
        },
        {
          name: "millisecond",
          description: "日にちの中のミリ秒. `0 to 86399999 (=1000*60*60*24-1)`",
          type: noArgumentsType(d.Int32.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "accountToken",
          description: "アカウントトークン",
          type: noArgumentsType(d.AccountToken.typePartId),
        },
        {
          name: "projectId",
          description: "プロジェクトID",
          type: noArgumentsType(d.ProjectId.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "moduleName",
          description:
            "モジュール名, 使うときにはnamedインポートされ, そのモジュール識別子は自動的につけられる",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "name",
          description: "変数名",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
      ],
    },
  },
  {
    id: d.OpenIdConnectProvider.typePartId,
    name: "OpenIdConnectProvider",
    description: "ソーシャルログインを提供するプロバイダー Googleのみサポート",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Google",
          description:
            "Google ( https://developers.google.com/identity/sign-in/web/ )",
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "型パーツの名前",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "description",
          description: "型パーツの説明",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "projectId",
          description: "所属しているプロジェクトのID",
          type: noArgumentsType(d.ProjectId.typePartId),
        },
        {
          name: "attribute",
          description:
            "コンパイラに与える,この型を表現するのにどういう特殊な状態にするかという情報",
          type: maybeType(d.TypeAttribute.typePartId),
        },
        {
          name: "dataTypeParameterList",
          description: "データ型パラメーター",
          type: listType(d.DataTypeParameter.typePartId),
        },
        {
          name: "body",
          description: "定義本体",
          type: noArgumentsType(d.TypePartBody.typePartId),
        },
        {
          name: "id",
          description: "型パーツを識別するID",
          type: noArgumentsType(d.TypePartId.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "id",
          description: "プロジェクトID",
          type: noArgumentsType(d.ProjectId.typePartId),
        },
        {
          name: "name",
          description: "プロジェクト名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "typePartList",
          description: "型パーツの定義",
          type: listType(d.TypePart.typePartId),
        },
        {
          name: "partList",
          description: "パーツの定義",
          type: listType(d.Part.typePartId),
        },
      ],
    },
  },
  {
    name: "TsExpr",
    description: "JavaScript の 式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "NumberLiteral",
          description: "数値リテラル `123`",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.Int32.typePartId),
          },
        },
        {
          name: "StringLiteral",
          description: '文字列リテラル `"text"`',
          parameter: {
            _: "Just",
            value: noArgumentsType(d.String.typePartId),
          },
        },
        {
          name: "BooleanLiteral",
          description: "booleanリテラル",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.Bool.typePartId),
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
            value: noArgumentsType(d.UnaryOperatorExpr.typePartId),
          },
        },
        {
          name: "BinaryOperator",
          description: "2項演算子での式",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.BinaryOperatorExpr.typePartId),
          },
        },
        {
          name: "ConditionalOperator",
          description: "条件演算子 `a ? b : c`",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ConditionalOperatorExpr.typePartId),
          },
        },
        {
          name: "ArrayLiteral",
          description: "配列リテラル `[1, 2, 3]`",
          parameter: {
            _: "Just",
            value: listType(d.ArrayItem.typePartId),
          },
        },
        {
          name: "ObjectLiteral",
          description: 'オブジェクトリテラル `{ data: 123, text: "sorena" }`',
          parameter: {
            _: "Just",
            value: listType(d.TsMember.typePartId),
          },
        },
        {
          name: "Lambda",
          description: "ラムダ式 `() => {}`",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.LambdaExpr.typePartId),
          },
        },
        {
          name: "Variable",
          description: "変数. 変数が存在するかのチャックがされる",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TsIdentifier.typePartId),
          },
        },
        {
          name: "GlobalObjects",
          description: "グローバルオブジェクト",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TsIdentifier.typePartId),
          },
        },
        {
          name: "ImportedVariable",
          description: "インポートされた変数",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ImportedVariable.typePartId),
          },
        },
        {
          name: "Get",
          description: "プロパティの値を取得する `a.b a[12] data[f(2)]`",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.GetExpr.typePartId),
          },
        },
        {
          name: "Call",
          description: '関数を呼ぶ f(x)",',
          parameter: {
            _: "Just",
            value: noArgumentsType(d.CallExpr.typePartId),
          },
        },
        {
          name: "New",
          description: "式からインスタンスを作成する `new Date()`",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.CallExpr.typePartId),
          },
        },
        {
          name: "TypeAssertion",
          description: "型アサーション `a as string`",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TypeAssertion.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "first",
          description: "左の型",
          type: noArgumentsType(d.ElmType.typePartId),
        },
        {
          name: "second",
          description: "右の型",
          type: noArgumentsType(d.ElmType.typePartId),
        },
      ],
    },
  },
  {
    id: d.Project.typePartId,
    name: "Project",
    description: "definy の プロジェクト",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "プロジェクト名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "iconHash",
          description: "プロジェクトのアイコン画像",
          type: noArgumentsType(d.ImageHash.typePartId),
        },
        {
          name: "imageHash",
          description: "initMemberDescription",
          type: noArgumentsType(d.ImageHash.typePartId),
        },
        {
          name: "createTime",
          description: "initMemberDescription",
          type: noArgumentsType(d.Time.typePartId),
        },
        {
          name: "createAccountId",
          description: "プロジェクトを作成したアカウント",
          type: noArgumentsType(d.AccountId.typePartId),
        },
        {
          name: "updateTime",
          description: "更新日時",
          type: noArgumentsType(d.Time.typePartId),
        },
        {
          name: "id",
          description: "プロジェクトを識別するID",
          type: noArgumentsType(d.ProjectId.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "elementVariableName",
          description: "要素の変数名",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "iterableExpr",
          description: "繰り返す対象",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "statementList",
          description: "繰り返す文",
          type: listType(d.Statement.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "exportDefinitionList",
          description: "外部に公開する定義",
          type: listType(d.ExportDefinition.typePartId),
        },
        {
          name: "statementList",
          description: "定義した後に実行するコード",
          type: listType(d.Statement.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "メンバー名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "description",
          description: "メンバーの説明",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "type",
          description: "メンバー値の型",
          type: noArgumentsType(d.Type.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "StringLiteral",
          description: "文字列リテラル",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.String.typePartId),
          },
        },
        {
          name: "IntLiteral",
          description: "整数リテラル",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.Int32.typePartId),
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
            value: listType(d.ElmExpr.typePartId),
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
            value: noArgumentsType(d.ElmExpr.typePartId),
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
            value: noArgumentsType(d.String.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: listType(d.TsIdentifier.typePartId),
        },
        {
          name: "parameterList",
          description: "パラメーターの型. 意味のない引数名は適当に付く",
          type: listType(d.TsType.typePartId),
        },
        {
          name: "return",
          description: "戻り値の型",
          type: noArgumentsType(d.TsType.typePartId),
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
    dataTypeParameterList: [
      { name: "first", description: "タプルの0番目の値" },
      { name: "second", description: "タプルの1番目の値" },
    ],
    body: {
      _: "Product",
      memberList: [
        {
          name: "first",
          description: "0番目の値",
          type: {
            input: d.Maybe.Nothing(),
            output: d.DataTypeOrDataTypeParameter.DataTypeParameter(0),
          },
        },
        {
          name: "second",
          description: "1番目の値",
          type: {
            input: d.Maybe.Nothing(),
            output: d.DataTypeOrDataTypeParameter.DataTypeParameter(1),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "カスタム型名",
          type: noArgumentsType(d.ElmTypeName.typePartId),
        },
        {
          name: "export",
          description: "外部に公開するレベル",
          type: noArgumentsType(d.ElmCustomTypeExportLevel.typePartId),
        },
        {
          name: "comment",
          description: "コメント",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "parameter",
          description: "型パラメーター",
          type: listType(d.String.typePartId),
        },
        {
          name: "variantList",
          description: "バリアントのリスト. 値コンストラクタ. タグ",
          type: listType(d.ElmVariant.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "呼ばれる式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "parameterList",
          description: "パラメーター",
          type: listType(d.TsExpr.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "変数の名前",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "document",
          description: "ドキュメント",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "type",
          description: "変数の型",
          type: noArgumentsType(d.TsType.typePartId),
        },
        {
          name: "expr",
          description: "変数の式",
          type: noArgumentsType(d.TsExpr.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "kernel",
          description: "関数",
          type: noArgumentsType(d.KernelExpr.typePartId),
        },
        {
          name: "expr",
          description: "呼び出すパラメーター",
          type: noArgumentsType(d.EvaluatedExpr.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "expr",
          description: "式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "propertyExpr",
          description: "プロパティの式",
          type: noArgumentsType(d.TsExpr.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "moduleName",
          description:
            "モジュール名. namedImportされるがその識別子は自動的に作成される",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "name",
          description: "型の名前",
          type: noArgumentsType(d.TsIdentifier.typePartId),
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
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Token" },
  },
  {
    id: d.KernelExpr.typePartId,
    name: "KernelExpr",
    description: "definyだけでは表現できない式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Token" },
  },
  {
    id: d.Location.typePartId,
    name: "Location",
    description:
      "definyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
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
            value: noArgumentsType(d.ProjectId.typePartId),
          },
        },
        {
          name: "Account",
          description: "アカウント詳細ページ",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.AccountId.typePartId),
          },
        },
        {
          name: "Setting",
          description: "設定ページ",
          parameter: { _: "Nothing" },
        },
        {
          name: "About",
          description: "definyについて説明したページ",
          parameter: { _: "Nothing" },
        },
        {
          name: "TypePart",
          description: "型パーツ編集ページ",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TypePartId.typePartId),
          },
        },
        {
          name: "Part",
          description: "パーツ編集ページ",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.PartId.typePartId),
          },
        },
        {
          name: "LocalProject",
          description: "ローカルで保存するプロジェクトファイルの編集ページ",
          parameter: d.Maybe.Nothing(),
        },
        {
          name: "ToolList",
          description: "definyとは関係ないかもしれないツールたりのページ一覧",
          parameter: d.Maybe.Nothing(),
        },
        {
          name: "Tool",
          description: "definyとは関係ないかもしれないツールたりのページ",
          parameter: d.Maybe.Just({
            input: d.Maybe.Nothing(),
            output: d.DataTypeOrDataTypeParameter.DataType({
              typePartId: d.ToolName.typePartId,
              arguments: [],
            }),
          }),
        },
      ],
    },
  },
  {
    id: d.ToolName.typePartId,
    name: "ToolName",
    description: "Tool名",
    attribute: d.Maybe.Nothing(),
    dataTypeParameterList: [],
    projectId: coreProjectId,
    body: d.TypePartBody.Sum([
      {
        name: "ThemeColorRainbow",
        description: "テーマカラーレインボー",
        parameter: d.Maybe.Nothing(),
      },
      {
        name: "SoundQuiz",
        description: "音のクイズ",
        parameter: d.Maybe.Nothing(),
      },
    ]),
  },
  {
    id: d.TypeAlias.typePartId,
    name: "TypeAlias",
    description: "TypeAlias. `export type T = {}`",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "型の名前",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: listType(d.TsIdentifier.typePartId),
        },
        {
          name: "document",
          description: "ドキュメント",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "type",
          description: "型本体",
          type: noArgumentsType(d.TsType.typePartId),
        },
      ],
    },
  },
  {
    name: "AccountId",
    description: "アカウントを識別するためのID",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Id" },
    id: d.AccountId.typePartId,
  },
  {
    id: d.KeyValue.typePartId,
    name: "KeyValue",
    description: "文字列のkeyと式のvalue",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "key",
          description: "key",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "value",
          description: "value",
          type: noArgumentsType(d.TsExpr.typePartId),
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
    dataTypeParameterList: [
      {
        name: "element",
        description: "リストの要素のデータ型",
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
    dataTypeParameterList: [],
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
            value: noArgumentsType(d.OpenIdConnectProvider.typePartId),
          },
        },
        {
          name: "JumpingToLogInPage",
          description: "ログインURLを受け取り,ログイン画面へ移行中",
          parameter: { _: "Nothing" },
        },
        {
          name: "LoadingAccountData",
          description: "アカウントの情報を取得中",
          parameter: d.Maybe.Nothing(),
        },
        {
          name: "LoggedIn",
          description: "ログインしている状態",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.AccountTokenAccountId.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "counterVariableName",
          description: "カウンタ変数名",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "untilExpr",
          description: "ループの上限の式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "statementList",
          description: "繰り返す文",
          type: listType(d.Statement.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "プロパティ名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "required",
          description: "必須かどうか falseの場合 ? がつく",
          type: noArgumentsType(d.Bool.typePartId),
        },
        {
          name: "type",
          description: "型",
          type: noArgumentsType(d.TsType.typePartId),
        },
        {
          name: "document",
          description: "ドキュメント",
          type: noArgumentsType(d.String.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "condition",
          description: "条件の式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "thenExpr",
          description: "条件がtrueのときに評価される式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "elseExpr",
          description: "条件がfalseのときに評価される式",
          type: noArgumentsType(d.TsExpr.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "condition",
          description: "条件の式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "thenStatementList",
          description: "条件がtrueのときに実行する文",
          type: listType(d.Statement.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "FieldName",
          description:
            '**直接 FieldName.FieldName("name") と指定してはいけない!! Elmの識別子として使える文字としてチェックできないため**',
          parameter: {
            _: "Just",
            value: noArgumentsType(d.String.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "VariantName",
          description:
            '**直接 VariantName.VariantName("Loading") と指定してはいけない!! Elmの識別子として使える文字としてチェックできないため**',
          parameter: {
            _: "Just",
            value: noArgumentsType(d.String.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "left",
          description: "左に指定する型",
          type: noArgumentsType(d.TsType.typePartId),
        },
        {
          name: "right",
          description: "右に指定する型",
          type: noArgumentsType(d.TsType.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "パーツの名前",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "description",
          description: "パーツの説明",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "type",
          description: "パーツの型",
          type: noArgumentsType(d.Type.typePartId),
        },
        {
          name: "expr",
          description: "パーツの式",
          type: noArgumentsType(d.Expr.typePartId),
        },
        {
          name: "projectId",
          description: "所属しているプロジェクトのID",
          type: noArgumentsType(d.ProjectId.typePartId),
        },
        {
          name: "id",
          description: "パーツを識別するID",
          type: noArgumentsType(d.PartId.typePartId),
        },
      ],
    },
  },
  {
    id: d.EvaluatedExpr.typePartId,
    name: "EvaluatedExpr",
    description: "definyの評価しきった式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Kernel",
          description: "definyだけでは表現できない式",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.KernelExpr.typePartId),
          },
        },
        {
          name: "Int32",
          description: "32bit整数",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.Int32.typePartId),
          },
        },
        {
          name: "TagReference",
          description: "タグを参照",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TagReference.typePartId),
          },
        },
        {
          name: "KernelCall",
          description: "内部関数呼び出し",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.KernelCall.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "accountToken",
          description: "アカウントトークン",
          type: noArgumentsType(d.AccountToken.typePartId),
        },
        {
          name: "typePartId",
          description: "型パーツのID",
          type: noArgumentsType(d.TypePartId.typePartId),
        },
        {
          name: "name",
          description: "設定する型パーツ名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "description",
          description: "設定する説明文",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "attribute",
          description: "設定する属性",
          type: maybeType(d.TypeAttribute.typePartId),
        },
        {
          name: "typeParameterList",
          description: "設定する型パラメーター",
          type: listType(d.DataTypeParameter.typePartId),
        },
        {
          name: "body",
          description: "設定する型定義本体",
          type: noArgumentsType(d.TypePartBody.typePartId),
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
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "関数名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "type",
          description: "型",
          type: noArgumentsType(d.ElmType.typePartId),
        },
        {
          name: "expr",
          description: "式",
          type: noArgumentsType(d.ElmExpr.typePartId),
        },
        {
          name: "comment",
          description: "コメント",
          type: noArgumentsType(d.String.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "外部に公開する関数の名前",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "document",
          description: "ドキュメント",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: listType(d.TsIdentifier.typePartId),
        },
        {
          name: "parameterList",
          description: "パラメーター",
          type: listType(d.ParameterWithDocument.typePartId),
        },
        {
          name: "returnType",
          description: "戻り値の型",
          type: noArgumentsType(d.TsType.typePartId),
        },
        {
          name: "statementList",
          description: "関数の本体",
          type: listType(d.Statement.typePartId),
        },
      ],
    },
  },
  {
    name: "AccountToken",
    description:
      "アカウントトークン. アカウントトークンを持っていればアクセストークンをdefinyのサーバーにリクエストした際に得られるIDのアカウントを保有していると証明できる. サーバーにハッシュ化したものを保存している. これが盗まれた場合,不正に得た人はアカウントを乗っ取ることができる. 有効期限はなし, 最後に発行したアカウントトークン以外は無効になる",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Token" },
    id: d.AccountToken.typePartId,
  },
  {
    id: d.FunctionDefinitionStatement.typePartId,
    name: "FunctionDefinitionStatement",
    description: "ローカル関数定義",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "変数名",
          type: noArgumentsType(d.TsIdentifier.typePartId),
        },
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: listType(d.TsIdentifier.typePartId),
        },
        {
          name: "parameterList",
          description: "パラメーターのリスト",
          type: listType(d.ParameterWithDocument.typePartId),
        },
        {
          name: "returnType",
          description: "戻り値の型",
          type: noArgumentsType(d.TsType.typePartId),
        },
        {
          name: "statementList",
          description: "関数本体",
          type: listType(d.Statement.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "name",
          description: "タグ名",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "description",
          description: "パターンの説明",
          type: noArgumentsType(d.String.typePartId),
        },
        {
          name: "parameter",
          description: "そのパターンにつけるデータの型",
          type: maybeType(d.Type.typePartId),
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
    dataTypeParameterList: [],
    body: { _: "Kernel", typePartBodyKernel: "Token" },
  },
  {
    id: d.Expr.typePartId,
    name: "Expr",
    description: "definy の 式",
    projectId: coreProjectId,
    attribute: { _: "Nothing" },
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Kernel",
          description: "definyだけでは表現できない式",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.KernelExpr.typePartId),
          },
        },
        {
          name: "Int32Literal",
          description: "32bit整数",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.Int32.typePartId),
          },
        },
        {
          name: "PartReference",
          description: "パーツの値を参照",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.PartId.typePartId),
          },
        },
        {
          name: "TagReference",
          description: "タグを参照",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.TagReference.typePartId),
          },
        },
        {
          name: "FunctionCall",
          description: "関数呼び出し",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.FunctionCall.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "typePartId",
          description: "型ID. タグIDがあれば, 型を導出できそうだが……",
          type: noArgumentsType(d.TypePartId.typePartId),
        },
        {
          name: "tagId",
          description: "タグID",
          type: noArgumentsType(d.TagId.typePartId),
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
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "operator",
          description: "2項演算子",
          type: noArgumentsType(d.BinaryOperator.typePartId),
        },
        {
          name: "left",
          description: "左の式",
          type: noArgumentsType(d.TsExpr.typePartId),
        },
        {
          name: "right",
          description: "右の式",
          type: noArgumentsType(d.TsExpr.typePartId),
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
    dataTypeParameterList: [],
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "parameterList",
          description: "パラメーターのリスト",
          type: listType(d.Parameter.typePartId),
        },
        {
          name: "typeParameterList",
          description: "型パラメーターのリスト",
          type: listType(d.TsIdentifier.typePartId),
        },
        {
          name: "returnType",
          description: "戻り値の型",
          type: noArgumentsType(d.TsType.typePartId),
        },
        {
          name: "statementList",
          description: "ラムダ式本体",
          type: listType(d.Statement.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Product",
      memberList: [
        {
          name: "openIdConnectProvider",
          description: "ログインに使用するプロバイダー",
          type: noArgumentsType(d.OpenIdConnectProvider.typePartId),
        },
        {
          name: "locationAndLanguage",
          description: "ログインした後に返ってくるURLに必要なデータ",
          type: noArgumentsType(d.LocationAndLanguage.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "TypeAlias",
          description: "型エイリアス. レコード型に名前を付ける",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ElmTypeAlias.typePartId),
          },
        },
        {
          name: "CustomType",
          description: "カスタム型. 代数的データ型",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.ElmCustomType.typePartId),
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
    dataTypeParameterList: [],
    body: {
      _: "Sum",
      patternList: [
        {
          name: "Spread",
          description: "...a のようにする",
          parameter: d.Maybe.Just(noArgumentsType(d.TsExpr.typePartId)),
        },
        {
          name: "KeyValue",
          description: "a: b のようにする",
          parameter: {
            _: "Just",
            value: noArgumentsType(d.KeyValue.typePartId),
          },
        },
      ],
    },
  },
  {
    id: d.Type.typePartId,
    name: "Type",
    description: "definy の型",
    attribute: d.Maybe.Nothing(),
    projectId: coreProjectId,
    dataTypeParameterList: [],
    body: d.TypePartBody.Product([
      {
        name: "input",
        description: "入力のデータ型",
        type: maybeType(d.DataTypeOrDataTypeParameter.typePartId),
      },
      {
        name: "output",
        description: "出力のデータ型",
        type: noArgumentsType(d.DataTypeOrDataTypeParameter.typePartId),
      },
    ]),
  },
  {
    id: d.DataTypeParameter.typePartId,
    name: "DataTypeParameter",
    description: "データ型パラメータに指定するもの",
    attribute: d.Maybe.Nothing(),
    body: d.TypePartBody.Product([
      {
        name: "name",
        description: "データ型パラメータの名前",
        type: noArgumentsType(d.String.typePartId),
      },
      {
        name: "description",
        description: "データ型パラメータの説明文",
        type: noArgumentsType(d.String.typePartId),
      },
    ]),
    projectId: coreProjectId,
    dataTypeParameterList: [],
  },
  {
    id: d.DataType.typePartId,
    name: "DataType",
    description: "直接的に, 関数ではないデータ型 (内部に関数を保つ場合はある)",
    attribute: d.Maybe.Nothing(),
    dataTypeParameterList: [],
    projectId: coreProjectId,
    body: d.TypePartBody.Product([
      {
        name: "typePartId",
        description: "型パーツID",
        type: noArgumentsType(d.TypePartId.typePartId),
      },
      {
        name: "arguments",
        description: "データ型のパラメータに指定する. arguments",
        type: listType(d.DataTypeOrDataTypeParameter.typePartId),
      },
    ]),
  },
  {
    id: d.DataTypeOrDataTypeParameter.typePartId,
    name: "DataTypeOrDataTypeParameter",
    description: "データタイプか, データタイプパラメーターで定義されたもの",
    attribute: d.Maybe.Nothing(),
    dataTypeParameterList: [],
    projectId: coreProjectId,
    body: d.TypePartBody.Sum([
      {
        name: "DataType",
        description: "データタイプ",
        parameter: d.Maybe.Just(noArgumentsType(d.DataType.typePartId)),
      },
      {
        name: "DataTypeParameter",
        description: "データタイプパラメータで指定したパラメータ",
        parameter: d.Maybe.Just(noArgumentsType(d.Int32.typePartId)),
      },
    ]),
  },
  {
    id: d.CodeAndState.typePartId,
    name: "CodeAndState",
    description: "ソーシャルログインしたあとに返ってくるパラメーター",
    attribute: d.Maybe.Nothing(),
    dataTypeParameterList: [],
    projectId: coreProjectId,
    body: d.TypePartBody.Product([
      {
        name: "code",
        description: "",
        type: noArgumentsType(d.String.typePartId),
      },
      {
        name: "state",
        description: "",
        type: noArgumentsType(d.String.typePartId),
      },
      {
        name: "openIdConnectProvider",
        description: "",
        type: noArgumentsType(d.OpenIdConnectProvider.typePartId),
      },
    ]),
  },
  {
    id: d.AccountTokenAndUrlDataAndAccount.typePartId,
    name: "AccountTokenAndUrlDataAndAccount",
    description: "アカウントトークンとUrlData (場所と言語)",
    attribute: d.Maybe.Nothing(),
    dataTypeParameterList: [],
    projectId: coreProjectId,
    body: d.TypePartBody.Product([
      {
        name: "accountToken",
        description: "アカウントトークン",
        type: noArgumentsType(d.AccountToken.typePartId),
      },
      {
        name: "locationAndLanguage",
        description: "場所と言語",
        type: noArgumentsType(d.LocationAndLanguage.typePartId),
      },
      {
        name: "account",
        description: "ログインした account",
        type: noArgumentsType(d.Account.typePartId),
      },
    ]),
  },
  {
    id: d.UrlData.typePartId,
    name: "UrlData",
    description: "logInCallback も含めた URL に入る場所と言語",
    attribute: d.Maybe.Nothing(),
    dataTypeParameterList: [],
    projectId: coreProjectId,
    body: d.TypePartBody.Sum([
      {
        name: "Normal",
        description: "普通の場所",
        parameter: d.Maybe.Just(
          noArgumentsType(d.LocationAndLanguage.typePartId)
        ),
      },
      {
        name: "LogInCallback",
        description: "ソーシャルログインから返ってきたときのURL",
        parameter: d.Maybe.Just(noArgumentsType(d.CodeAndState.typePartId)),
      },
    ]),
  },
];

export const generateDataTsTypeScriptCode = (): string => {
  const code = generateTypeScriptCode(
    new Map(typePartList.map((typePart) => [typePart.id, typePart]))
  );
  if (code._ === "Error") {
    throw new Error(JSON.stringify(code.error));
  }

  return jsTs.generateCodeAsString(code.ok, d.CodeType.TypeScript);
};