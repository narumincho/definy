import 'package:definy/localization.dart';
import 'package:flutter/material.dart';

class LanguageDropDown extends StatelessWidget {
  const LanguageDropDown({
    required this.onLanguageChanged,
    super.key,
  });

  final ValueChanged<SupportedLanguage> onLanguageChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButton<SupportedLanguage>(
      icon: const Icon(Icons.language),
      value: SupportedLanguage.values.firstWhere(
        (language) =>
            language.name == Localizations.localeOf(context).languageCode,
      ),
      items: [
        ...SupportedLanguage.values.map(
          (language) => DropdownMenuItem(
            value: language,
            child: Text(
              language.label,
              locale: Locale(language.name),
            ),
          ),
        )
      ],
      onChanged: (selected) {
        if (selected != null) {
          onLanguageChanged(selected);
        }
      },
    );
  }
}
