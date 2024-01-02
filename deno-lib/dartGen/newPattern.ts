// commection の型の構造変更案

type Pattern = {
  parameters: { name: string }[];
  type: Type;
  arguments: { name: string }[];
};

/*
 *

sealed class A<T> {
    A();
}

// Dart
final class A0 implements A<String> {

}

// Dart, TS
final class A1<T> implements A<T> {

}

// Dart
final class A2<T> implements A<String> {

}

// これはdartでは, ありえないが
// commection ではありえるようにする...?
// Rust はあり得る?
// とりあえずありえるようにして問題が発生したら考えよう
// x
final class A3<String> implements A<String> {

}

// これはdartでは, ありえないが
// commection ではありえるようにする...?
// とりあえずありえるようにして問題が発生したら考えよう

// TS
final class A3<String> implements A<T> {

}



 */
