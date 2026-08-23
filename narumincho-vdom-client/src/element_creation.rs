use narumincho_vdom::Namespace;

pub fn create_element(name: &str, namespace: Namespace) -> web_sys::Element {
    match namespace {
        Namespace::Html => crate::DOCUMENT.create_element(name).unwrap(),
        Namespace::Svg => crate::DOCUMENT
            .create_element_ns(Some("http://www.w3.org/2000/svg"), name)
            .unwrap(),
        Namespace::MathML => crate::DOCUMENT
            .create_element_ns(Some("http://www.w3.org/1998/Math/MathML"), name)
            .unwrap(),
    }
}
