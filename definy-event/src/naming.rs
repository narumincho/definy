//! 識別子（パーツ名、モジュール名、型名など）の命名規則とバリデーション

/// 名前が「記号なし アルファベット小文字 ハイフン区切り」に適合しているかを判定します。
///
/// 規則:
/// - 空文字不可
/// - 小文字アルファベット (`a-z`) および数字 (`0-9`) のみ使用可能
/// - 単語の区切りとして単一のハイフン (`-`) を使用可能
/// - 先頭または末尾にハイフンは使用不可
/// - 連続したハイフン (`--`) は使用不可
/// - アンダースコア (`_`)、空白、大文字、各種記号は使用不可
#[must_use]
pub fn is_valid_name(name: &str) -> bool {
    if name.is_empty() {
        return false;
    }

    for segment in name.split('-') {
        if segment.is_empty() {
            return false;
        }
        for c in segment.chars() {
            if !c.is_ascii_lowercase() && !c.is_ascii_digit() {
                return false;
            }
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_names() {
        assert!(is_valid_name("a"));
        assert!(is_valid_name("core"));
        assert!(is_valid_name("plus"));
        assert!(is_valid_name("number-literal"));
        assert!(is_valid_name("less-than-or-equal"));
        assert!(is_valid_name("triangle-area"));
        assert!(is_valid_name("option-number"));
        assert!(is_valid_name("i32"));
        assert!(is_valid_name("utf-8"));
        assert!(is_valid_name("v1"));
        assert!(is_valid_name("sample-123"));
    }

    #[test]
    fn test_invalid_names() {
        // 空文字
        assert!(!is_valid_name(""));
        // 大文字
        assert!(!is_valid_name("Number"));
        assert!(!is_valid_name("OptionNumber"));
        assert!(!is_valid_name("Core"));
        // アンダースコア
        assert!(!is_valid_name("triangle_area"));
        assert!(!is_valid_name("less_than"));
        // スペース
        assert!(!is_valid_name("number literal"));
        assert!(!is_valid_name("less than"));
        // ハイフンで開始・終了・連続
        assert!(!is_valid_name("-test"));
        assert!(!is_valid_name("test-"));
        assert!(!is_valid_name("test--name"));
        // 記号
        assert!(!is_valid_name("test.name"));
        assert!(!is_valid_name("test/name"));
        assert!(!is_valid_name("test+name"));
        assert!(!is_valid_name("test:name"));
    }
}
