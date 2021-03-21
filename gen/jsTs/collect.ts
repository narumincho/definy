import {
  CallExpr,
  ExportDefinition,
  Expr,
  Function as Function_,
  Identifer,
  JsTsCode,
  Statement,
  Type,
  TypeAlias,
  Variable,
} from "./data";
import { UsedNameAndModulePathSet } from "./util";

/**
 * グローバル空間とルートにある関数名の引数名、使っている外部モジュールのパスを集める
 * コードのエラーもチェックする
 * @throws コードにエラーが見つかった
 */
export const collectInCode = (code: JsTsCode): UsedNameAndModulePathSet => {
  const rootScopeIdentiferSet = collectRootScopeIdentifer(
    code.exportDefinitionList
  );

  return concatCollectData(
    collectList(code.exportDefinitionList, (definition) =>
      collectInDefinition(definition, rootScopeIdentiferSet)
    ),
    collectStatementList(
      code.statementList,
      [],
      [],
      rootScopeIdentiferSet,
      new Set()
    )
  );
};

type RootScopeIdentiferSet = {
  rootScopeTypeNameSet: ReadonlySet<string>;
  rootScopeVariableName: ReadonlySet<string>;
};

/**
 * 定義の名前を収集する
 * @throws 同名の定義があった場合
 */
const collectRootScopeIdentifer = (
  definitionList: ReadonlyArray<ExportDefinition>
): RootScopeIdentiferSet => {
  const typeNameSet: Set<string> = new Set();
  const variableNameSet: Set<string> = new Set();
  for (const definition of definitionList) {
    switch (definition._) {
      case "TypeAlias":
        if (typeNameSet.has(definition.typeAlias.name.string)) {
          throw new Error(
            "Duplicate typeAlias name. name=" + definition.typeAlias.name.string
          );
        }
        typeNameSet.add(definition.typeAlias.name.string);
        break;

      case "Function":
        if (variableNameSet.has(definition.function.name.string)) {
          throw new Error(
            "Duplicate export function name. name=" +
              definition.function.name.string
          );
        }
        variableNameSet.add(definition.function.name.string);
        break;

      case "Variable":
        if (variableNameSet.has(definition.variable.name.string)) {
          throw new Error(
            "Duplicate export variable name. name=" +
              definition.variable.name.string
          );
        }
        variableNameSet.add(definition.variable.name.string);
    }
  }
  return {
    rootScopeTypeNameSet: typeNameSet,
    rootScopeVariableName: variableNameSet,
  };
};

const collectInDefinition = (
  definition: ExportDefinition,
  rootScopeIdentiferSet: RootScopeIdentiferSet
): UsedNameAndModulePathSet => {
  switch (definition._) {
    case "TypeAlias":
      return collectInTypeAlias(
        definition.typeAlias,
        rootScopeIdentiferSet.rootScopeTypeNameSet
      );

    case "Function":
      return collectInFunctionDefinition(
        definition.function,
        rootScopeIdentiferSet
      );

    case "Variable":
      return collectInVariableDefinition(
        definition.variable,
        rootScopeIdentiferSet
      );
  }
};

const collectInTypeAlias = (
  typeAlias: TypeAlias,
  rootScopeTypeNameSet: ReadonlySet<string>
): UsedNameAndModulePathSet =>
  concatCollectData(
    {
      usedNameSet: new Set([typeAlias.name.string]),
      modulePathSet: new Set(),
    },
    collectInType(typeAlias.type, rootScopeTypeNameSet, [
      new Set(typeAlias.typeParameterList.map((identifer) => identifer.string)),
    ])
  );

const collectInFunctionDefinition = (
  function_: Function_,
  rootScopeIdentiferSet: RootScopeIdentiferSet
): UsedNameAndModulePathSet => {
  const parameterNameSet = checkDuplicateIdentifer(
    "export function parameter name",
    function_.parameterList.map((parameter) => parameter.name)
  );
  const typeParameterNameSet = checkDuplicateIdentifer(
    "export function type parameter name",
    function_.typeParameterList
  );
  return concatCollectData(
    concatCollectData(
      concatCollectData(
        {
          modulePathSet: new Set(),
          usedNameSet: new Set([function_.name.string]),
        },
        collectList(function_.parameterList, (parameter) =>
          concatCollectData(
            {
              usedNameSet: new Set([parameter.name.string]),
              modulePathSet: new Set(),
            },
            collectInType(
              parameter.type,
              rootScopeIdentiferSet.rootScopeTypeNameSet,
              [typeParameterNameSet]
            )
          )
        )
      ),
      collectInType(
        function_.returnType,
        rootScopeIdentiferSet.rootScopeTypeNameSet,
        [typeParameterNameSet]
      )
    ),
    collectStatementList(
      function_.statementList,
      [],
      [typeParameterNameSet],
      rootScopeIdentiferSet,
      parameterNameSet
    )
  );
};

const collectInVariableDefinition = (
  variable: Variable,
  rootScopeIdentiferSet: RootScopeIdentiferSet
): UsedNameAndModulePathSet =>
  concatCollectData(
    concatCollectData(
      {
        modulePathSet: new Set(),
        usedNameSet: new Set([variable.name.string]),
      },
      collectInType(variable.type, rootScopeIdentiferSet.rootScopeTypeNameSet, [
        new Set(),
      ])
    ),
    collectInExpr(variable.expr, [], [], rootScopeIdentiferSet)
  );

/**
 * グローバルで使われているものを収集したり、インポートしているものを収集する
 * @param expr 式
 * @param scanData グローバルで使われている名前の集合などのコード全体の情報の収集データ。上書きする
 */
const collectInExpr = (
  expr: Expr,
  localVariableNameSetList: ReadonlyArray<ReadonlySet<string>>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<string>>,
  rootScopeIdentiferSet: RootScopeIdentiferSet
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
        rootScopeIdentiferSet
      );

    case "BinaryOperator":
      return concatCollectData(
        collectInExpr(
          expr.binaryOperatorExpr.left,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        ),
        collectInExpr(
          expr.binaryOperatorExpr.right,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        )
      );
    case "ConditionalOperator":
      return concatCollectData(
        collectInExpr(
          expr.conditionalOperatorExpr.condition,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        ),
        concatCollectData(
          collectInExpr(
            expr.conditionalOperatorExpr.thenExpr,
            localVariableNameSetList,
            typeParameterSetList,
            rootScopeIdentiferSet
          ),
          collectInExpr(
            expr.conditionalOperatorExpr.elseExpr,
            localVariableNameSetList,
            typeParameterSetList,
            rootScopeIdentiferSet
          )
        )
      );

    case "ArrayLiteral":
      return collectList(expr.arrayItemList, (item) =>
        collectInExpr(
          item.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        )
      );

    case "ObjectLiteral":
      return collectList(expr.memberList, (member) => {
        switch (member._) {
          case "Spread":
            return collectInExpr(
              member.expr,
              localVariableNameSetList,
              typeParameterSetList,
              rootScopeIdentiferSet
            );
          case "KeyValue":
            return collectInExpr(
              member.keyValue.value,
              localVariableNameSetList,
              typeParameterSetList,
              rootScopeIdentiferSet
            );
        }
      });

    case "Lambda": {
      const parameterNameSet = checkDuplicateIdentifer(
        "lambda parameter name",
        expr.lambdaExpr.parameterList.map((parameter) => parameter.name)
      );
      const newTypeParameterSetList = typeParameterSetList.concat(
        checkDuplicateIdentifer(
          "lambda type paramter name",
          expr.lambdaExpr.typeParameterList
        )
      );

      return concatCollectData(
        concatCollectData(
          collectList(expr.lambdaExpr.parameterList, (oneParameter) =>
            concatCollectData(
              {
                usedNameSet: new Set([oneParameter.name.string]),
                modulePathSet: new Set(),
              },
              collectInType(
                oneParameter.type,
                rootScopeIdentiferSet.rootScopeTypeNameSet,
                newTypeParameterSetList
              )
            )
          ),
          collectInType(
            expr.lambdaExpr.returnType,
            rootScopeIdentiferSet.rootScopeTypeNameSet,
            newTypeParameterSetList
          )
        ),
        collectStatementList(
          expr.lambdaExpr.statementList,
          localVariableNameSetList,
          newTypeParameterSetList,
          rootScopeIdentiferSet,
          parameterNameSet
        )
      );
    }

    case "Variable":
      checkVariableIsDefinedOrThrow(
        localVariableNameSetList,
        rootScopeIdentiferSet.rootScopeVariableName,
        expr.identifer
      );
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set(),
      };

    case "GlobalObjects":
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set([expr.identifer.string]),
      };

    case "ImportedVariable":
      return {
        modulePathSet: new Set([expr.importedVariable.moduleName]),
        usedNameSet: new Set([expr.importedVariable.name.string]),
      };

    case "Get":
      return concatCollectData(
        collectInExpr(
          expr.getExpr.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        ),
        collectInExpr(
          expr.getExpr.propertyExpr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        )
      );

    case "Call":
      return collectCallExpr(
        expr.callExpr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentiferSet
      );

    case "New":
      return collectCallExpr(
        expr.callExpr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentiferSet
      );

    case "TypeAssertion":
      return concatCollectData(
        collectInExpr(
          expr.typeAssertion.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        ),
        collectInType(
          expr.typeAssertion.type,
          rootScopeIdentiferSet.rootScopeTypeNameSet,
          typeParameterSetList
        )
      );
  }
};

const collectCallExpr = (
  callExpr: CallExpr,
  localVariableNameSetList: ReadonlyArray<ReadonlySet<string>>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<string>>,
  rootScopeIdentiferSet: RootScopeIdentiferSet
) =>
  concatCollectData(
    collectInExpr(
      callExpr.expr,
      localVariableNameSetList,
      typeParameterSetList,
      rootScopeIdentiferSet
    ),
    collectList(callExpr.parameterList, (parameter) =>
      collectInExpr(
        parameter,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentiferSet
      )
    )
  );

const collectStatementList = (
  statementList: ReadonlyArray<Statement>,
  localVariableNameSetList: ReadonlyArray<ReadonlySet<string>>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<string>>,
  rootScopeIdentiferSet: RootScopeIdentiferSet,
  parameterNameSet: ReadonlySet<string>
): UsedNameAndModulePathSet => {
  const newLocalVariableNameSetList = localVariableNameSetList.concat(
    new Set([...parameterNameSet, ...collectNameInStatement(statementList)])
  );
  return collectList(statementList, (statement) =>
    collectInStatement(
      statement,
      newLocalVariableNameSetList,
      typeParameterSetList,
      rootScopeIdentiferSet
    )
  );
};

const collectNameInStatement = (
  statementList: ReadonlyArray<Statement>
): ReadonlySet<string> => {
  const identiferSet: Set<string> = new Set();
  for (const statement of statementList) {
    switch (statement._) {
      case "VariableDefinition":
        identiferSet.add(statement.variableDefinitionStatement.name.string);
        break;
      case "FunctionDefinition":
        identiferSet.add(statement.functionDefinitionStatement.name.string);
    }
  }
  return identiferSet;
};

const collectInStatement = (
  statement: Statement,
  localVariableNameSetList: ReadonlyArray<ReadonlySet<string>>,
  typeParameterSetList: ReadonlyArray<ReadonlySet<string>>,
  rootScopeIdentiferSet: RootScopeIdentiferSet
): UsedNameAndModulePathSet => {
  switch (statement._) {
    case "EvaluateExpr":
      return collectInExpr(
        statement.expr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentiferSet
      );

    case "Set":
      return concatCollectData(
        collectInExpr(
          statement.setStatement.target,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        ),
        collectInExpr(
          statement.setStatement.expr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        )
      );

    case "If":
      return concatCollectData(
        collectInExpr(
          statement.ifStatement.condition,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        ),
        collectStatementList(
          statement.ifStatement.thenStatementList,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet,
          new Set()
        )
      );

    case "ThrowError":
      return collectInExpr(
        statement.expr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentiferSet
      );

    case "Return":
      return collectInExpr(
        statement.expr,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentiferSet
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
          rootScopeIdentiferSet
        ),
        collectInType(
          statement.variableDefinitionStatement.type,
          rootScopeIdentiferSet.rootScopeTypeNameSet,
          typeParameterSetList
        )
      );

    case "FunctionDefinition": {
      const parameterNameSet = checkDuplicateIdentifer(
        "local function parameter name",
        statement.functionDefinitionStatement.parameterList.map(
          (parameter) => parameter.name
        )
      );
      const newTypeParameterSetList = typeParameterSetList.concat(
        checkDuplicateIdentifer(
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
              rootScopeIdentiferSet.rootScopeTypeNameSet,
              newTypeParameterSetList
            )
        ),
        concatCollectData(
          collectInType(
            statement.functionDefinitionStatement.returnType,
            rootScopeIdentiferSet.rootScopeTypeNameSet,
            newTypeParameterSetList
          ),
          collectStatementList(
            statement.functionDefinitionStatement.statementList,
            localVariableNameSetList,
            newTypeParameterSetList,
            rootScopeIdentiferSet,
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
          rootScopeIdentiferSet
        ),
        collectStatementList(
          statement.forStatement.statementList,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet,
          new Set([statement.forStatement.counterVariableName.string])
        )
      );

    case "ForOf":
      return concatCollectData(
        collectInExpr(
          statement.forOfStatement.iterableExpr,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet
        ),
        collectStatementList(
          statement.forOfStatement.statementList,
          localVariableNameSetList,
          typeParameterSetList,
          rootScopeIdentiferSet,
          new Set([statement.forOfStatement.elementVariableName.string])
        )
      );

    case "WhileTrue":
      return collectStatementList(
        statement.statementList,
        localVariableNameSetList,
        typeParameterSetList,
        rootScopeIdentiferSet,
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
          rootScopeIdentiferSet
        ),
        collectList(statement.switchStatement.patternList, (pattern) =>
          collectStatementList(
            pattern.statementList,
            localVariableNameSetList,
            typeParameterSetList,
            rootScopeIdentiferSet,
            new Set()
          )
        )
      );
  }
};

const checkVariableIsDefinedOrThrow = (
  localVariableNameSetList: ReadonlyArray<ReadonlySet<string>>,
  rootScopeNameSet: ReadonlySet<string>,
  variableName: Identifer
): void => {
  const reversedLocalVariableNameSetList = [
    ...localVariableNameSetList,
  ].reverse();
  for (const localVariableNameSet of reversedLocalVariableNameSetList) {
    if (localVariableNameSet.has(variableName.string)) {
      return;
    }
  }
  if (rootScopeNameSet.has(variableName.string)) {
    return;
  }
  throw new Error(
    "存在しない変数を指定されました name=" +
      variableName.string +
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
  type_: Type,
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
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set(),
      };

    case "Object":
      return collectList([...type_.memberTypeList], (member) =>
        collectInType(member.type, rootScopeTypeNameSet, typeParameterSetList)
      );

    case "Function": {
      const newTypeParameterSetList = typeParameterSetList.concat(
        checkDuplicateIdentifer(
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

    case "WithTypeParameter":
      return concatCollectData(
        collectInType(
          type_.typeWithTypeParameter.type,
          rootScopeTypeNameSet,
          typeParameterSetList
        ),
        collectList(
          type_.typeWithTypeParameter.typeParameterList,
          (parameter) =>
            collectInType(parameter, rootScopeTypeNameSet, typeParameterSetList)
        )
      );

    case "Union":
      return collectList(type_.typeList, (oneType) =>
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
      return {
        modulePathSet: new Set([type_.importedType.moduleName]),
        usedNameSet: new Set([type_.importedType.name.string]),
      };

    case "ScopeInFile":
      checkTypeIsDefinedOrThrow(
        rootScopeTypeNameSet,
        typeParameterSetList,
        type_.identifer
      );
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set([type_.identifer.string]),
      };

    case "ScopeInGlobal":
      return {
        modulePathSet: new Set(),
        usedNameSet: new Set([type_.identifer.string]),
      };

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
  typeName: Identifer
): void => {
  const reversedTypeParameterSetList = [...typeParameterSetList].reverse();
  for (const typeParameter of reversedTypeParameterSetList) {
    if (typeParameter.has(typeName.string)) {
      return;
    }
  }
  if (rootScopeTypeNameSet.has(typeName.string)) {
    return;
  }
  throw new Error(
    "存在しない型変数を指定されました typeName=" +
      typeName.string +
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
  const usedNameSet: Set<string> = new Set();
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
 * @param identiferList 識別子のリスト
 */
const checkDuplicateIdentifer = (
  name: string,
  identiferList: ReadonlyArray<Identifer>
): ReadonlySet<string> => {
  const set: Set<string> = new Set();
  for (const identifer of identiferList) {
    if (set.has(identifer.string)) {
      throw new Error("Duplicate " + name + ". name = " + identifer.string);
    }
    set.add(identifer.string);
  }
  return set;
};
