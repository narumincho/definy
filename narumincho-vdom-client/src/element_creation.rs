// このファイルは narumincho-vdom-build によって自動生成されました。

pub fn create_element(name: &str, is_svg: bool) -> web_sys::Element {
    if is_svg || is_svg_element_only(name) {
        crate::DOCUMENT
            .create_element_ns(Some("http://www.w3.org/2000/svg"), name)
            .unwrap()
    } else if is_mathml_element_only(name) {
        crate::DOCUMENT
            .create_element_ns(Some("http://www.w3.org/1998/Math/MathML"), name)
            .unwrap()
    } else {
        crate::DOCUMENT.create_element(name).unwrap()
    }
}

fn is_svg_element_only(name: &str) -> bool {
    matches!(
        name,
        "animate"
            | "animateMotion"
            | "animateTransform"
            | "circle"
            | "clipPath"
            | "defs"
            | "desc"
            | "ellipse"
            | "feBlend"
            | "feColorMatrix"
            | "feComponentTransfer"
            | "feComposite"
            | "feConvolveMatrix"
            | "feDiffuseLighting"
            | "feDisplacementMap"
            | "feDistantLight"
            | "feFlood"
            | "feFuncA"
            | "feFuncB"
            | "feFuncG"
            | "feFuncR"
            | "feGaussianBlur"
            | "feImage"
            | "feMerge"
            | "feMergeNode"
            | "feMorphology"
            | "feOffset"
            | "fePointLight"
            | "feSpecularLighting"
            | "feSpotLight"
            | "feTile"
            | "feTurbulence"
            | "filter"
            | "foreignObject"
            | "g"
            | "image"
            | "line"
            | "linearGradient"
            | "marker"
            | "mask"
            | "metadata"
            | "mpath"
            | "path"
            | "pattern"
            | "polygon"
            | "polyline"
            | "radialGradient"
            | "rect"
            | "set"
            | "stop"
            | "svg"
            | "switch"
            | "symbol"
            | "text"
            | "textPath"
            | "tspan"
            | "use"
            | "view"
    )
}

fn is_mathml_element_only(name: &str) -> bool {
    matches!(
        name,
        "annotation"
            | "annotation-xml"
            | "maction"
            | "math"
            | "merror"
            | "mfrac"
            | "mi"
            | "mmultiscripts"
            | "mn"
            | "mo"
            | "mover"
            | "mpadded"
            | "mphantom"
            | "mprescripts"
            | "mroot"
            | "mrow"
            | "ms"
            | "mspace"
            | "msqrt"
            | "mstyle"
            | "msub"
            | "msubsup"
            | "msup"
            | "mtable"
            | "mtd"
            | "mtext"
            | "mtr"
            | "munder"
            | "munderover"
            | "semantics"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_element_namespaces() {
        assert!(is_svg_element_only("path"));
        assert!(is_svg_element_only("rect"));
        assert!(is_svg_element_only("circle"));
        assert!(is_svg_element_only("svg"));

        assert!(!is_svg_element_only("a"));
        assert!(!is_svg_element_only("script"));
        assert!(!is_svg_element_only("style"));
        assert!(!is_svg_element_only("title"));

        assert!(is_mathml_element_only("math"));
        assert!(is_mathml_element_only("mfrac"));
        assert!(is_mathml_element_only("mi"));

        assert!(!is_svg_element_only("div"));
        assert!(!is_svg_element_only("span"));
        assert!(!is_mathml_element_only("div"));
        assert!(!is_mathml_element_only("span"));
    }
}
