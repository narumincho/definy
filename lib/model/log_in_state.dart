import 'package:flutter/material.dart';

@immutable
sealed class LogInState {
  const LogInState();
}

@immutable
final class LogInStateNotLoggedIn implements LogInState {
  const LogInStateNotLoggedIn();
}

@immutable
final class LogInStateLoading implements LogInState {
  const LogInStateLoading();
}
