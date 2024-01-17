import 'package:definy/localization.dart';
import 'package:definy/widget/language_dropdown.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/link.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({
    required this.onLanguageChanged,
    super.key,
  });

  final ValueChanged<SupportedLanguage> onLanguageChanged;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          LanguageDropDown(onLanguageChanged: onLanguageChanged),
        ],
      ),
      Text(MaterialLocalizations.of(context).aboutListTileTitle('definy')),
      Text(AppLocalization.of(context).aboutDescription),
      Link(
        uri: Uri.parse('https://github.com/narumincho/definy'),
        builder: (context, followLink) => TextButton(
          onPressed: followLink,
          child: const Text('GitHub'),
        ),
      ),
      Text(MaterialLocalizations.of(context).licensesPageTitle),
      const Text('Hack typeface https://github.com/source-foundry/Hack'),
    ]);
  }
}
