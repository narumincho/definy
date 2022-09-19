import * as d from "./data.ts";
import { TsIdentifier } from "./identifier.ts";
import { UsedNameAndModulePathSet } from "./interface.ts";

/**
 * グローバル空間とルートにある関数名の引数名、使っている外部モジュールのパスを集める
 * コードのエラーもチェックする
 * @throws コードにエラーが見つかった
 */
export const collectInCode = (code: d.JsTsCode): UsedNameAndModulePathSet => {
  const rootScopeIdentifierSet = collectRootScopeIdentifier(
    code.exportDefinitionList
  );

  return concatCollectData(
    collectList(code.exportDefinitionList, (definition) =>
      collectInDefinition(definition, rootScopeIdentifierSet)
    ),
    collectStatementList(
      code.statementList,
      [],
      [],
      rootScopeIdentifierSet,
      new Set()
    )
  );
};

type RootScopeIdentifierSet = {
  rootScopeTypeNameSet: ReadonlySet<TsIdentifier>;
  rootScopeVariableName: ReadonlySet<TsIdentifier>;
};

/**
 * 定義の名前を収集する
 * @throws 同名の定義があった場合
 */
const collectRootScopeIdentifier = (
  definitionList: ReadonlyArray<d.ExportDefinition>
): RootScopeIdentifierSet => {
  const typeNameSet: Set<TsIdentifier> = new Set();
  const variableNameSet: Set<TsIdentifier> = new Set();
  for (const definition of definitionList) {
    switch (definition.type) {
      case "typeAlias":
        if (typeNameSet.has(definition.typeAlias.name)) {
          throw new Error(
            "Duplicate typeAlias name. name=" + definition.typeAlias.name
          );
        }
        typeNameSet.add(definition.typeAlias.name);
        break;

      case "function":
        if (variableNameSet.has(definition.function.name)) {
          throw new Error(
            "Duplicate export function name. name=" + definition.function.name
          );
        }
        variableNameSet.add(definition.function.name);
        break;

      case "variable":
        if (variableNameSet.has(definition.variable.name)) {
          throw new Error(
            "Duplicate export variable name. name=" + definition.variable.name
          );
        }
        variableNameSet.add(definition.variable.name);
    }
  }
  return {
    rootScopeTypeNameSet: typeNameSet,
    rootScopeVariableName: variableNameSet,
  };
};

const collectInDefinition = (
  definition: d.ExportDefinition,
  rootScopeIdentifierSet: RootScopeIdentifierSet
): UsedNameAndModulePathSet => {
  switch (definition.type) {
    case "typeAlias":
      return collectInTypeAlias(
        definition.typeAlias,
        rootScopeIdentifierSet.rootScopeTypeNameSet
      );

    case "function":
      return collectInFunctionDefinition(
        definition.function,
        rootScopeIdentifierSet
      );

    case "variable":
      return collectInVariableDefinition(
        definition.variable,
        rootScopeIdentifierSet
      );
  }
};

const collectInTypeAlias = (
  typeAlias: d.TypeAlias,
  rootScopeTypeNameSet: ReadonlySet<string>
): UsedNameAndModulePathSet =>
  concatCollectData(
    {
      usedNameSet: new Set([typeAlias.name]),
      modulePathSet: new Set(),
    },
    collectInType(typeAlias.type, rootScopeTypeNameSet, [
      new Set(typeAlias.typeParameterList),
    ])
  );

const collectInFunctionDefinition = (
  function_: d.Function,
  rootScopeIdentifierSet: RootScopeIdentifierSet
): UsedNameAndModulePathSet => {
  const parameterNameSet = checkDuplicateIdentifier(
    "export function parameter name",
    function_.parameterList.map((parameter) => parameter.name)
  );
  const typeParameterNameSet = checkDuplicateIdentifier(
    "export function type parameter name",
    function_.typeParameterList
  );
  return concatCollectData(
    concatCollectData(
      concatCollectData(
        {
          modulePathSet: new Set(),
          usedNameSet: new Set([function_.name]),
        },
        collectList(function_.parameterList, (parameter) =>
          concatCollectData(
            {
              usedNameSet: new Set([parameter.name]),
              modulePathSet: new Set(),
            },
            collectInType(
              parameter.type,
              rootScopeIdentifierSet.rootScopeTypeNameSet,
              [typeParameterNameSet]
            )
          )
        )
      ),
      collectInType(
        function_.returnType,
        rootScopeIdentifierSet.rootScopeTypeNameSet,
        [typeParameterNameSet]
      )
    ),
    collectStatementList(
      function_.statementList,
      [],
      [typeParameterNameSet],
      rootScopeIdentifierSet,
      parameterNameSet
    )
  );
};

const collectInVariableDefinition = (
  variable: d.Variable,
  rootScopeIdentifierSet: RootScopeIdentifierSet
): UsedNameAndModulePathSet =>
  concatCollectData(
    concatCollectData(
      {
        modulePathSet: new Set(),
        usedNameSet: new Set([variable.name]),
      },
      collectInType(
        variable.type,
        rootScopeIdentifierSet.rootScopeTypeNameSet,
        [new Set()]
      )
    ),
    collectInExpr(variable.expr, [], [], rootScopeIdentifierSet)
  );

/**
 * グローバルで使われているものを収集したり、インポートしているものを収集する
 * @param expr 式
 * @param scanData グローバルで使われている名前の集合などのコード全体の情報の収集データ。上書きする
 */
const collectInExpr = (
  expr: d.TsExpr,
  localVariableNameSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  rootScopeIdentifierSet: RootScopeIdentifierSet
): UsedNameAndModulePathSet => {
  switch (expr._) {
    case "NumberLiteral":
    case "StringLiteral":
    case "BooleanLiteral":
    case "NullLiteral":
    case "UndefinedLiteral":
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set(),
      };

    case "UnaryOperator":
      return collectInExpr(
        expr.unaryOperatorExpr.expr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentifierSet
      );

    case "BinaryOperator":
      return concatCollectData(
        collectInExpr(
          expr.binaryOperatorExpr.left,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectInExpr(
          expr.binaryOperatorExpr.right,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        )
      );
    case "ConditionalOperator":
      return concatCollectData(
        collectInExpr(
          expr.conditionalOperatorExpr.condition,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        concatCollectData(
          collectInExpr(
            expr.conditionalOperatorExpr.thenExpr,
            localVariableNameSetList,
            typeParameterSetList,
            rootScopeIdentifierSet
          ),
          collectInExpr(
            expr.conditionalOperatorExpr.elseExpr,
            localVariableNameSetList,
            typeParameterSetList,
            rootScopeIdentifierSet
          )
        )
      );

    case "ArrayLiteral":
      return collectList(expr.arrayItemList, (item) =>
        collectInExpr(
          item.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        )
      );

    case "ObjectLiteral":
      return collectList(expr.tsMemberList, (member) => {
        switch (member._) {
          case "Spread":
            return collectInExpr(
              member.tsExpr,
              localVariableNameSetList,
              typeParameterSetList,
              rootScopeIdentifierSet
            );
          case "KeyValue":
            return collectInExpr(
              member.keyValue.value,
              localVariableNameSetList,
              typeParameterSetList,
              rootScopeIdentifierSet
            );
        }
      });

    case "Lambda": {
      const parameterNameSet = checkDuplicateIdentifier(
        "lambda parameter name",
        expr.lambdaExpr.parameterList.map((parameter) => parameter.name)
      );
      const newTypeParameterSetList = typeParameterSetList.concat(
        checkDuplicateIdentifier(
          "lambda type parameter name",
          expr.lambdaExpr.typeParameterList
        )
      );

      return concatCollectData(
        concatCollectData(
          collectList(expr.lambdaExpr.parameterList, (oneParameter) =>
            concatCollectData(
              {
                usedNameSet: new Set([oneParameter.name]),
                modulePathSet: new Set(),
              },
              collectInType(
                oneParameter.type,
                rootScopeIdentifierSet.rootScopeTypeNameSet,
                newTypeParameterSetList
              )
            )
          ),
          collectInType(
            expr.lambdaExpr.returnType,
            rootScopeIdentifierSet.rootScopeTypeNameSet,
            newTypeParameterSetList
          )
        ),
        collectStatementList(
          expr.lambdaExpr.statementList,
          localVariableNameSetList,
          newTypeParameterSetList,
          rootScopeIdentifierSet,
          parameterNameSet
        )
      );
    }

    case "Variable":
      checkVariableIsDefinedOrThrow(
        localVariableNameSetList,
        rootScopeIdentifierSet.rootScopeVariableName,
        expr.tsIdentifier
      );
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set(),
      };

    case "GlobalObjects":
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set([expr.tsIdentifier]),
      };

    case "ImportedVariable":
      return {
        modulePathSet: new Set([expr.importedVariable.moduleName]),
        usedNameSet: new Set([expr.importedVariable.name]),
      };

    case "Get":
      return concatCollectData(
        collectInExpr(
          expr.getExpr.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectInExpr(
          expr.getExpr.propertyExpr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        )
      );

    case "Call":
      return collectCallExpr(
        expr.callExpr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentifierSet
      );

    case "New":
      return collectCallExpr(
        expr.callExpr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentifierSet
      );

    case "TypeAssertion":
      return concatCollectData(
        collectInExpr(
          expr.typeAssertion.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectInType(
          expr.typeAssertion.type,
          rootScopeIdentifierSet.rootScopeTypeNameSet,
          typeParameterSetList
        )
      );
  }
};

const collectCallExpr = (
  callExpr: d.CallExpr,
  localVariableNameSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  rootScopeIdentifierSet: RootScopeIdentifierSet
) =>
  concatCollectData(
    collectInExpr(
      callExpr.expr,
      localVariableNameSetList,
      typeParameterSetList,
      rootScopeIdentifierSet
    ),
    collectList(callExpr.parameterList, (parameter) =>
      collectInExpr(
        parameter,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentifierSet
      )
    )
  );

const collectStatementList = (
  statementList: ReadonlyArray<d.Statement>,
  localVariableNameSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  rootScopeIdentifierSet: RootScopeIdentifierSet,
  parameterNameSet: ReadonlySet<TsIdentifier>
): UsedNameAndModulePathSet => {
  const newLocalVariableNameSetList = localVariableNameSetList.concat(
    new Set([...parameterNameSet, ...collectNameInStatement(statementList)])
  );
  return collectList(statementList, (statement) =>
    collectInStatement(
      statement,
      newLocalVariableNameSetList,
      typeParameterSetList,
      rootScopeIdentifierSet
    )
  );
};

const collectNameInStatement = (
  statementList: ReadonlyArray<d.Statement>
): ReadonlySet<TsIdentifier> => {
  const identifierSet: Set<TsIdentifier> = new Set();
  for (const statement of statementList) {
    switch (statement._) {
      case "VariableDefinition":
        identifierSet.add(statement.variableDefinitionStatement.name);
        break;
      case "FunctionDefinition":
        identifierSet.add(statement.functionDefinitionStatement.name);
    }
  }
  return identifierSet;
};

const collectInStatement = (
  statement: d.Statement,
  localVariableNameSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  rootScopeIdentifierSet: RootScopeIdentifierSet
): UsedNameAndModulePathSet => {
  switch (statement._) {
    case "EvaluateExpr":
      return collectInExpr(
        statement.tsExpr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentifierSet
      );

    case "Set":
      return concatCollectData(
        collectInExpr(
          statement.setStatement.target,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectInExpr(
          statement.setStatement.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        )
      );

    case "If":
      return concatCollectData(
        collectInExpr(
          statement.ifStatement.condition,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectStatementList(
          statement.ifStatement.thenStatementList,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet,
          new Set()
        )
      );

    case "ThrowError":
      return collectInExpr(
        statement.tsExpr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentifierSet
      );

    case "Return":
      return collectInExpr(
        statement.tsExpr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentifierSet
      );

    case "ReturnVoid":
    case "Continue":
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set(),
      };

    case "VariableDefinition":
      return concatCollectData(
        collectInExpr(
          statement.variableDefinitionStatement.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectInType(
          statement.variableDefinitionStatement.type,
          rootScopeIdentifierSet.rootScopeTypeNameSet,
          typeParameterSetList
        )
      );

    case "FunctionDefinition": {
      const parameterNameSet = checkDuplicateIdentifier(
        "local function parameter name",
        statement.functionDefinitionStatement.parameterList.map(
          (parameter) => parameter.name
        )
      );
      const newTypeParameterSetList = typeParameterSetList.concat(
        checkDuplicateIdentifier(
          "local function type parameter name",
          statement.functionDefinitionStatement.typeParameterList
        )
      );
      return concatCollectData(
        collectList(
          statement.functionDefinitionStatement.parameterList,
          (parameter) =>
            collectInType(
              parameter.type,
              rootScopeIdentifierSet.rootScopeTypeNameSet,
              newTypeParameterSetList
            )
        ),
        concatCollectData(
          collectInType(
            statement.functionDefinitionStatement.returnType,
            rootScopeIdentifierSet.rootScopeTypeNameSet,
            newTypeParameterSetList
          ),
          collectStatementList(
            statement.functionDefinitionStatement.statementList,
            localVariableNameSetList,
            newTypeParameterSetList,
            rootScopeIdentifierSet,
            parameterNameSet
          )
        )
      );
    }

    case "For":
      return concatCollectData(
        collectInExpr(
          statement.forStatement.untilExpr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectStatementList(
          statement.forStatement.statementList,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet,
          new Set([statement.forStatement.counterVariableName])
        )
      );

    case "ForOf":
      return concatCollectData(
        collectInExpr(
          statement.forOfStatement.iterableExpr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectStatementList(
          statement.forOfStatement.statementList,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet,
          new Set([statement.forOfStatement.elementVariableName])
        )
      );

    case "WhileTrue":
      return collectStatementList(
        statement.statementList,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentifierSet,
        new Set()
      );
    case "Break":
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set(),
      };

    case "Switch":
      return concatCollectData(
        collectInExpr(
          statement.switchStatement.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentifierSet
        ),
        collectList(statement.switchStatement.patternList, (pattern) =>
          collectStatementList(
            pattern.statementList,
            localVariableNameSetList,
            typeParameterSetList,
            rootScopeIdentifierSet,
            new Set()
          )
        )
      );
  }
};

const checkVariableIsDefinedOrThrow = (
  localVariableNameSetList: ReadonlyArray<ReadonlySet<TsIdentifier>>,
  rootScopeNameSet: ReadonlySet<TsIdentifier>,
  variableName: TsIdentifier
): void => {
  const reversedLocalVariableNameSetList = [
    ...localVariableNameSetList,
  ].reverse();
  for (const localVariableNameSet of reversedLocalVariableNameSetList) {
    if (localVariableNameSet.has(variableName)) {
      return;
    }
  }
  if (rootScopeNameSet.has(variableName)) {
    return;
  }
  console.warn(
    "存在しない変数を指定されました name=" +
      variableName +
      " スコープ内に存在している変数 =[ " +
      localVariableNameSetList
        .map((scope) => "[" + [...scope].join(",") + "]")
        .join(",") +
      " ]" +
      "ファイルの直下に存在している変数 =" +
      "[" +
      [...rootScopeNameSet].join(",") +
      "]"
  );
};

/**
 * グローバル空間(グローバル変数、直下の関数の引数名)に出ている型の名前を集める
 * @param type_ 型の式
 * @param scanData グローバルで使われている名前の集合などのコード全体の情報の収集データ。上書きする
 */
const collectInType = (
  type_: d.TsType,
  rootScopeTypeNameSet: ReadonlySet<string>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<string>>
): UsedNameAndModulePathSet => {
  switch (type_._) {
    case "Number":
    case "String":
    case "Boolean":
    case "Undefined":
    case "Null":
    case "Never":
    case "Void":
    case "unknown":
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set(),
      };

    case "Object":
      return collectList([...type_.tsMemberTypeList], (member) =>
        collectInType(member.type, rootScopeTypeNameSet, typeParameterSetList)
      );

    case "Function": {
      const newTypeParameterSetList = typeParameterSetList.concat(
        checkDuplicateIdentifier(
          "function type, type parameter",
          type_.functionType.typeParameterList
        )
      );
      return concatCollectData(
        collectList(type_.functionType.parameterList, (parameter) =>
          collectInType(
            parameter,
            rootScopeTypeNameSet,
            newTypeParameterSetList
          )
        ),
        collectInType(
          type_.functionType.return,
          rootScopeTypeNameSet,
          newTypeParameterSetList
        )
      );
    }

    case "Union":
      return collectList(type_.tsTypeList, (oneType) =>
        collectInType(oneType, rootScopeTypeNameSet, typeParameterSetList)
      );

    case "Intersection":
      return concatCollectData(
        collectInType(
          type_.intersectionType.left,
          rootScopeTypeNameSet,
          typeParameterSetList
        ),
        collectInType(
          type_.intersectionType.right,
          rootScopeTypeNameSet,
          typeParameterSetList
        )
      );

    case "ImportedType":
      return concatCollectData(
        {
          modulePathSet: new Set([type_.importedType.moduleName]),
          usedNameSet: new Set([type_.importedType.nameAndArguments.name]),
        },
        collectList(
          type_.importedType.nameAndArguments.arguments,
          (parameter) =>
            collectInType(parameter, rootScopeTypeNameSet, typeParameterSetList)
        )
      );

    case "ScopeInFile":
      return concatCollectData(
        {
          modulePathSet: new Set(),
          usedNameSet: new Set([type_.typeNameAndTypeParameter.name]),
        },
        collectList(type_.typeNameAndTypeParameter.arguments, (parameter) =>
          collectInType(parameter, rootScopeTypeNameSet, typeParameterSetList)
        )
      );

    case "ScopeInGlobal":
      return concatCollectData(
        {
          modulePathSet: new Set(),
          usedNameSet: new Set([type_.typeNameAndTypeParameter.name]),
        },
        collectList(type_.typeNameAndTypeParameter.arguments, (parameter) =>
          collectInType(parameter, rootScopeTypeNameSet, typeParameterSetList)
        )
      );

    case "StringLiteral":
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set(),
      };
  }
};

const checkTypeIsDefinedOrThrow = (
  rootScopeTypeNameSet: ReadonlySet<string>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<string>>,
  typeName: TsIdentifier
): void => {
  const reversedTypeParameterSetList = [...typeParameterSetList].reverse();
  for (const typeParameter of reversedTypeParameterSetList) {
    if (typeParameter.has(typeName)) {
      return;
    }
  }
  if (rootScopeTypeNameSet.has(typeName)) {
    return;
  }
  console.warn(
    "存在しない型変数を指定されました typeName=" +
      typeName +
      " 存在している変数 =[ " +
      typeParameterSetList
        .map((scope) => "[ " + [...scope].join(",") + " ]")
        .join(",") +
      "]" +
      "ファイルの直下に存在している型 =[ " +
      [...rootScopeTypeNameSet].join(",") +
      " ]"
  );
};

const concatCollectData = (
  collectDataA: UsedNameAndModulePathSet,
  collectDataB: UsedNameAndModulePathSet
): UsedNameAndModulePathSet => ({
  modulePathSet: new Set([
    ...collectDataA.modulePathSet,
    ...collectDataB.modulePathSet,
  ]),
  usedNameSet: new Set([
    ...collectDataA.usedNameSet,
    ...collectDataB.usedNameSet,
  ]),
});

const collectList = <Element>(
  list: ReadonlyArray<Element>,
  collectFunc: (element: Element) => UsedNameAndModulePathSet
): UsedNameAndModulePathSet => {
  const modulePathSet: Set<string> = new Set();
  const usedNameSet: Set<TsIdentifier> = new Set();
  for (const element of list) {
    const result = collectFunc(element);
    for (const path of result.modulePathSet) {
      modulePathSet.add(path);
    }
    for (const name of result.usedNameSet) {
      usedNameSet.add(name);
    }
  }
  return {
    modulePathSet,
    usedNameSet,
  };
};

/**
 * 識別子の重複を調べる
 * @param name エラーメッセージに使う.何の識別子を表すか
 * @param identifierList 識別子のリスト
 */
const checkDuplicateIdentifier = (
  name: string,
  identifierList: ReadonlyArray<TsIdentifier>
): ReadonlySet<TsIdentifier> => {
  const set: Set<TsIdentifier> = new Set();
  for (const identifier of identifierList) {
    if (set.has(identifier)) {
      throw new Error("Duplicate " + name + ". name = " + identifier);
    }
    set.add(identifier);
  }
  return set;
};
