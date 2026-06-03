// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/rtc
pub struct Rtc {}

pub fn rtc() -> Rtc {
    Rtc {}
}
impl Rtc {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Rtc(self),
        }
    }
}
