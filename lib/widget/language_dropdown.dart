import 'package:definy/localization.dart';
import 'package:fast_immutable_collections/fast_immutable_collections.dart';
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
            child: Row(children: [
              if (View.of(context).platformDispatcher.locale.languageCode ==
                  language.name)
                const Icon(Icons.star, size: 16)
              else
                View.of(context)
                        .platformDispatcher
                        .locales
                        .any((locale) => locale.languageCode == language.name)
                    ? const Icon(Icons.star_half, size: 16)
                    : const SizedBox(width: 16),
              Text(
                language.label,
                locale: Locale(language.name),
              ),
            ]),
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
