// Generated by simple_dart_code_gen. Do not edit.
// ignore_for_file: camel_case_types, constant_identifier_names, always_use_package_imports
import 'package:meta/meta.dart';
import 'package:narumincho_json/narumincho_json.dart' as narumincho_json;
import 'package:simple_graphql_client_gen/query_string.dart' as query_string;
import 'package:simple_graphql_client_gen/text.dart' as text;

///
///
/// ### simpleGraphQLClientGenAnnotation
/// ```json
/// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^[0-9a-f]{32}$"}
/// ```
@immutable
final class AccountId implements query_string.IntoQueryInput {
  ///
  ///
  /// ### simpleGraphQLClientGenAnnotation
  /// ```json
  /// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^[0-9a-f]{32}$"}
  /// ```
  const AccountId._(
    this.value,
  );

  /// 内部表現の文字列
  final String value;

  @override
  @useResult
  int get hashCode {
    return value.hashCode;
  }

  @override
  @useResult
  bool operator ==(
    Object other,
  ) {
    return (other is AccountId) && (value == other.value);
  }

  @override
  @useResult
  String toString() {
    return 'AccountId($value, )';
  }

  /// String からバリデーションして変換する. 変換できない場合は null が返される
  @useResult
  static AccountId? fromString(
    String value,
  ) {
    if (RegExp(r'^[0-9a-f]{32}$').hasMatch(value)) {
      return AccountId._(value);
    }
    return null;
  }

  @override
  @useResult
  query_string.QueryInput toQueryInput() {
    return query_string.QueryInputString(value);
  }

  @override
  @useResult
  narumincho_json.JsonValue toJsonValue() {
    return narumincho_json.JsonString(value);
  }

  static AccountId fromJsonValue(
    narumincho_json.JsonValue jsonValue,
  ) {
    return AccountId._(jsonValue.asStringOrThrow());
  }
}

/// アカウントを識別できるコード
///
/// ### simpleGraphQLClientGenAnnotation
/// ```json
/// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^[a-z0-9._]{2,31}$"}
/// ```
@immutable
final class AccountCode implements query_string.IntoQueryInput {
  /// アカウントを識別できるコード
  ///
  /// ### simpleGraphQLClientGenAnnotation
  /// ```json
  /// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^[a-z0-9._]{2,31}$"}
  /// ```
  const AccountCode._(
    this.value,
  );

  /// 内部表現の文字列
  final String value;

  @override
  @useResult
  int get hashCode {
    return value.hashCode;
  }

  @override
  @useResult
  bool operator ==(
    Object other,
  ) {
    return (other is AccountCode) && (value == other.value);
  }

  @override
  @useResult
  String toString() {
    return 'AccountCode($value, )';
  }

  /// String からバリデーションして変換する. 変換できない場合は null が返される
  @useResult
  static AccountCode? fromString(
    String value,
  ) {
    if (RegExp(r'^[a-z0-9._]{2,31}$').hasMatch(value)) {
      return AccountCode._(value);
    }
    return null;
  }

  @override
  @useResult
  query_string.QueryInput toQueryInput() {
    return query_string.QueryInputString(value);
  }

  @override
  @useResult
  narumincho_json.JsonValue toJsonValue() {
    return narumincho_json.JsonString(value);
  }

  static AccountCode fromJsonValue(
    narumincho_json.JsonValue jsonValue,
  ) {
    return AccountCode._(jsonValue.asStringOrThrow());
  }
}

/// 文字数制限(1...50)と空白の連続がないというを満たしている名前
///
/// ### simpleGraphQLClientGenAnnotation
/// ```json
/// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"text","maxLength":64}
/// ```
@immutable
final class AccountDisplayName implements query_string.IntoQueryInput {
  /// 文字数制限(1...50)と空白の連続がないというを満たしている名前
  ///
  /// ### simpleGraphQLClientGenAnnotation
  /// ```json
  /// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"text","maxLength":64}
  /// ```
  const AccountDisplayName._(
    this.value,
  );

  /// 内部表現の文字列. 最大文字数 64
  final String value;

  @override
  @useResult
  int get hashCode {
    return value.hashCode;
  }

  @override
  @useResult
  bool operator ==(
    Object other,
  ) {
    return (other is AccountDisplayName) && (value == other.value);
  }

  @override
  @useResult
  String toString() {
    return 'AccountDisplayName($value, )';
  }

  /// String から 前後の空白と空白の連続を取り除き, 文字数 64文字以内の条件を満たすかバリデーションして変換する. 変換できない場合は null が返される
  @useResult
  static AccountDisplayName? fromString(
    String value,
  ) {
    final normalized = text.textFromString(
      value,
      maxLength: 64,
    );
    if (normalized == null) {
      return null;
    }
    return AccountDisplayName._(normalized);
  }

  @override
  @useResult
  query_string.QueryInput toQueryInput() {
    return query_string.QueryInputString(value);
  }

  @override
  @useResult
  narumincho_json.JsonValue toJsonValue() {
    return narumincho_json.JsonString(value);
  }

  static AccountDisplayName fromJsonValue(
    narumincho_json.JsonValue jsonValue,
  ) {
    return AccountDisplayName._(jsonValue.asStringOrThrow());
  }
}

///
///
/// ### simpleGraphQLClientGenAnnotation
/// ```json
/// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^[0-9a-f]{32}$"}
/// ```
@immutable
final class TotpKeyId implements query_string.IntoQueryInput {
  ///
  ///
  /// ### simpleGraphQLClientGenAnnotation
  /// ```json
  /// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^[0-9a-f]{32}$"}
  /// ```
  const TotpKeyId._(
    this.value,
  );

  /// 内部表現の文字列
  final String value;

  @override
  @useResult
  int get hashCode {
    return value.hashCode;
  }

  @override
  @useResult
  bool operator ==(
    Object other,
  ) {
    return (other is TotpKeyId) && (value == other.value);
  }

  @override
  @useResult
  String toString() {
    return 'TotpKeyId($value, )';
  }

  /// String からバリデーションして変換する. 変換できない場合は null が返される
  @useResult
  static TotpKeyId? fromString(
    String value,
  ) {
    if (RegExp(r'^[0-9a-f]{32}$').hasMatch(value)) {
      return TotpKeyId._(value);
    }
    return null;
  }

  @override
  @useResult
  query_string.QueryInput toQueryInput() {
    return query_string.QueryInputString(value);
  }

  @override
  @useResult
  narumincho_json.JsonValue toJsonValue() {
    return narumincho_json.JsonString(value);
  }

  static TotpKeyId fromJsonValue(
    narumincho_json.JsonValue jsonValue,
  ) {
    return TotpKeyId._(jsonValue.asStringOrThrow());
  }
}

/// TOTPで生成されたコード
///
/// ### simpleGraphQLClientGenAnnotation
/// ```json
/// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^[0-9]{6}$"}
/// ```
@immutable
final class TotpCode implements query_string.IntoQueryInput {
  /// TOTPで生成されたコード
  ///
  /// ### simpleGraphQLClientGenAnnotation
  /// ```json
  /// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^[0-9]{6}$"}
  /// ```
  const TotpCode._(
    this.value,
  );

  /// 内部表現の文字列
  final String value;

  @override
  @useResult
  int get hashCode {
    return value.hashCode;
  }

  @override
  @useResult
  bool operator ==(
    Object other,
  ) {
    return (other is TotpCode) && (value == other.value);
  }

  @override
  @useResult
  String toString() {
    return 'TotpCode($value, )';
  }

  /// String からバリデーションして変換する. 変換できない場合は null が返される
  @useResult
  static TotpCode? fromString(
    String value,
  ) {
    if (RegExp(r'^[0-9]{6}$').hasMatch(value)) {
      return TotpCode._(value);
    }
    return null;
  }

  @override
  @useResult
  query_string.QueryInput toQueryInput() {
    return query_string.QueryInputString(value);
  }

  @override
  @useResult
  narumincho_json.JsonValue toJsonValue() {
    return narumincho_json.JsonString(value);
  }

  static TotpCode fromJsonValue(
    narumincho_json.JsonValue jsonValue,
  ) {
    return TotpCode._(jsonValue.asStringOrThrow());
  }
}

/// Base32でエンコードされたTOTPのシークレット
///
/// ### simpleGraphQLClientGenAnnotation
/// ```json
/// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^(?:[A-Z2-7]{8})*(?:[A-Z2-7][AEIMQUY4]={6}|[A-Z2-7]{3}[AQ]={4}|[A-Z2-7]{4}[ACEGIKMOQSUWY246]={3}|[A-Z2-7]{6}[AIQY]=)?$"}
/// ```
@immutable
final class TotpSecret implements query_string.IntoQueryInput {
  /// Base32でエンコードされたTOTPのシークレット
  ///
  /// ### simpleGraphQLClientGenAnnotation
  /// ```json
  /// {"$schema":"https://raw.githubusercontent.com/narumincho/simple_graphql_server_common/main/schema.json","type":"regexp","pattern":"^(?:[A-Z2-7]{8})*(?:[A-Z2-7][AEIMQUY4]={6}|[A-Z2-7]{3}[AQ]={4}|[A-Z2-7]{4}[ACEGIKMOQSUWY246]={3}|[A-Z2-7]{6}[AIQY]=)?$"}
  /// ```
  const TotpSecret._(
    this.value,
  );

  /// 内部表現の文字列
  final String value;

  @override
  @useResult
  int get hashCode {
    return value.hashCode;
  }

  @override
  @useResult
  bool operator ==(
    Object other,
  ) {
    return (other is TotpSecret) && (value == other.value);
  }

  @override
  @useResult
  String toString() {
    return 'TotpSecret($value, )';
  }

  /// String からバリデーションして変換する. 変換できない場合は null が返される
  @useResult
  static TotpSecret? fromString(
    String value,
  ) {
    if (RegExp(
            r'^(?:[A-Z2-7]{8})*(?:[A-Z2-7][AEIMQUY4]={6}|[A-Z2-7]{3}[AQ]={4}|[A-Z2-7]{4}[ACEGIKMOQSUWY246]={3}|[A-Z2-7]{6}[AIQY]=)?$')
        .hasMatch(value)) {
      return TotpSecret._(value);
    }
    return null;
  }

  @override
  @useResult
  query_string.QueryInput toQueryInput() {
    return query_string.QueryInputString(value);
  }

  @override
  @useResult
  narumincho_json.JsonValue toJsonValue() {
    return narumincho_json.JsonString(value);
  }

  static TotpSecret fromJsonValue(
    narumincho_json.JsonValue jsonValue,
  ) {
    return TotpSecret._(jsonValue.asStringOrThrow());
  }
}

/// An enum describing what kind of type a given `__Type` is.
enum GraphQL__TypeKind implements query_string.IntoQueryInput {
  /// Indicates this type is a scalar.
  SCALAR,

  /// Indicates this type is an object. `fields` and `interfaces` are valid fields.
  OBJECT,

  /// Indicates this type is an interface. `fields`, `interfaces`, and `possibleTypes` are valid fields.
  INTERFACE,

  /// Indicates this type is a union. `possibleTypes` is a valid field.
  UNION,

  /// Indicates this type is an enum. `enumValues` is a valid field.
  ENUM,

  /// Indicates this type is an input object. `inputFields` is a valid field.
  INPUT_OBJECT,

  /// Indicates this type is a list. `ofType` is a valid field.
  LIST,

  /// Indicates this type is a non-null. `ofType` is a valid field.
  NON_NULL,
  ;

  @override
  @useResult
  query_string.QueryInput toQueryInput() {
    return query_string.QueryInputEnum(name);
  }

  @override
  @useResult
  narumincho_json.JsonValue toJsonValue() {
    return narumincho_json.JsonString(name);
  }

  static GraphQL__TypeKind fromJsonValue(
    narumincho_json.JsonValue jsonValue,
  ) {
    return switch (jsonValue.asStringOrNull()) {
      'SCALAR' => GraphQL__TypeKind.SCALAR,
      'OBJECT' => GraphQL__TypeKind.OBJECT,
      'INTERFACE' => GraphQL__TypeKind.INTERFACE,
      'UNION' => GraphQL__TypeKind.UNION,
      'ENUM' => GraphQL__TypeKind.ENUM,
      'INPUT_OBJECT' => GraphQL__TypeKind.INPUT_OBJECT,
      'LIST' => GraphQL__TypeKind.LIST,
      'NON_NULL' => GraphQL__TypeKind.NON_NULL,
      _ => throw Exception(
          'unknown Enum Value. typeName __TypeKind. expected "SCALAR" or "OBJECT" or "INTERFACE" or "UNION" or "ENUM" or "INPUT_OBJECT" or "LIST" or "NON_NULL". but got ${jsonValue.encode()}'),
    };
  }
}

/// A Directive can be adjacent to many parts of the GraphQL language, a __DirectiveLocation describes one such possible adjacencies.
enum GraphQL__DirectiveLocation implements query_string.IntoQueryInput {
  /// Location adjacent to a query operation.
  QUERY,

  /// Location adjacent to a mutation operation.
  MUTATION,

  /// Location adjacent to a subscription operation.
  SUBSCRIPTION,

  /// Location adjacent to a field.
  FIELD,

  /// Location adjacent to a fragment definition.
  FRAGMENT_DEFINITION,

  /// Location adjacent to a fragment spread.
  FRAGMENT_SPREAD,

  /// Location adjacent to an inline fragment.
  INLINE_FRAGMENT,

  /// Location adjacent to a variable definition.
  VARIABLE_DEFINITION,

  /// Location adjacent to a schema definition.
  SCHEMA,

  /// Location adjacent to a scalar definition.
  SCALAR,

  /// Location adjacent to an object type definition.
  OBJECT,

  /// Location adjacent to a field definition.
  FIELD_DEFINITION,

  /// Location adjacent to an argument definition.
  ARGUMENT_DEFINITION,

  /// Location adjacent to an interface definition.
  INTERFACE,

  /// Location adjacent to a union definition.
  UNION,

  /// Location adjacent to an enum definition.
  ENUM,

  /// Location adjacent to an enum value definition.
  ENUM_VALUE,

  /// Location adjacent to an input object type definition.
  INPUT_OBJECT,

  /// Location adjacent to an input object field definition.
  INPUT_FIELD_DEFINITION,
  ;

  @override
  @useResult
  query_string.QueryInput toQueryInput() {
    return query_string.QueryInputEnum(name);
  }

  @override
  @useResult
  narumincho_json.JsonValue toJsonValue() {
    return narumincho_json.JsonString(name);
  }

  static GraphQL__DirectiveLocation fromJsonValue(
    narumincho_json.JsonValue jsonValue,
  ) {
    return switch (jsonValue.asStringOrNull()) {
      'QUERY' => GraphQL__DirectiveLocation.QUERY,
      'MUTATION' => GraphQL__DirectiveLocation.MUTATION,
      'SUBSCRIPTION' => GraphQL__DirectiveLocation.SUBSCRIPTION,
      'FIELD' => GraphQL__DirectiveLocation.FIELD,
      'FRAGMENT_DEFINITION' => GraphQL__DirectiveLocation.FRAGMENT_DEFINITION,
      'FRAGMENT_SPREAD' => GraphQL__DirectiveLocation.FRAGMENT_SPREAD,
      'INLINE_FRAGMENT' => GraphQL__DirectiveLocation.INLINE_FRAGMENT,
      'VARIABLE_DEFINITION' => GraphQL__DirectiveLocation.VARIABLE_DEFINITION,
      'SCHEMA' => GraphQL__DirectiveLocation.SCHEMA,
      'SCALAR' => GraphQL__DirectiveLocation.SCALAR,
      'OBJECT' => GraphQL__DirectiveLocation.OBJECT,
      'FIELD_DEFINITION' => GraphQL__DirectiveLocation.FIELD_DEFINITION,
      'ARGUMENT_DEFINITION' => GraphQL__DirectiveLocation.ARGUMENT_DEFINITION,
      'INTERFACE' => GraphQL__DirectiveLocation.INTERFACE,
      'UNION' => GraphQL__DirectiveLocation.UNION,
      'ENUM' => GraphQL__DirectiveLocation.ENUM,
      'ENUM_VALUE' => GraphQL__DirectiveLocation.ENUM_VALUE,
      'INPUT_OBJECT' => GraphQL__DirectiveLocation.INPUT_OBJECT,
      'INPUT_FIELD_DEFINITION' =>
        GraphQL__DirectiveLocation.INPUT_FIELD_DEFINITION,
      _ => throw Exception(
          'unknown Enum Value. typeName __DirectiveLocation. expected "QUERY" or "MUTATION" or "SUBSCRIPTION" or "FIELD" or "FRAGMENT_DEFINITION" or "FRAGMENT_SPREAD" or "INLINE_FRAGMENT" or "VARIABLE_DEFINITION" or "SCHEMA" or "SCALAR" or "OBJECT" or "FIELD_DEFINITION" or "ARGUMENT_DEFINITION" or "INTERFACE" or "UNION" or "ENUM" or "ENUM_VALUE" or "INPUT_OBJECT" or "INPUT_FIELD_DEFINITION". but got ${jsonValue.encode()}'),
    };
  }
}
