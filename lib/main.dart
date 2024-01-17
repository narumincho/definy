import 'package:definy/app.dart';
import 'package:definy/setup_no_web.dart'
    if (dart.library.html) 'package:definy/setup_web.dart';
import 'package:flutter/material.dart';

void main() async {
  setup();
  runApp(const DefinyApp());
}
