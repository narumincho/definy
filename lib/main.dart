import 'package:flutter/material.dart';
import 'package:definy/app.dart';
import 'package:definy/setup_no_web.dart'
    if (dart.library.html) 'package:definy/setup_web.dart';

void main() {
  setup();
  runApp(const DefinyApp());
}
