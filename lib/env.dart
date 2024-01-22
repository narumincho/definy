// ignore_for_file: do_not_use_environment

const origin =
    String.fromEnvironment('ORIGIN', defaultValue: 'http://localhost:8080');

final originUri = Uri.parse(origin);
