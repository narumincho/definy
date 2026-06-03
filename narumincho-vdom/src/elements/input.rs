// このファイルは narumincho-vdom-build によって自動生成されました。
use crate::Element;

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input
pub struct Input {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/accept
    pub accept: std::option::Option<String>,
    ///
    pub align: std::option::Option<String>,
    ///
    pub alpha: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#alt
    pub alt: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/autocomplete
    pub autocomplete: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/capture
    pub capture: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#checked
    pub checked: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/color
    pub colorspace: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#dirname
    pub dirname: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub disabled: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#form
    pub form: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#formaction
    pub formaction: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#formenctype
    pub formenctype: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#formmethod
    pub formmethod: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#formnovalidate
    pub formnovalidate: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#formtarget
    pub formtarget: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/max
    pub max: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/maxlength
    pub maxlength: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/min
    pub min: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/minlength
    pub minlength: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/multiple
    pub multiple: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#name
    pub name: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/pattern
    pub pattern: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#placeholder
    pub placeholder: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#popovertarget
    pub popovertarget: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#popovertargetaction
    pub popovertargetaction: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/readonly
    pub readonly: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#required
    pub required: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/size
    pub size: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input#src
    pub src: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/step
    pub step: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/checkbox#switch
    pub switch: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/button
    pub type_button: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/checkbox
    pub type_checkbox: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/color
    pub type_color: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/date
    pub type_date: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/datetime-local
    pub type_datetime_local: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/email
    pub type_email: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/file
    pub type_file: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/hidden
    pub type_hidden: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/image
    pub type_image: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/month
    pub type_month: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/number
    pub type_number: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/password
    pub type_password: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/radio
    pub type_radio: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/range
    pub type_range: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/reset
    pub type_reset: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/search
    pub type_search: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/submit
    pub type_submit: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/tel
    pub type_tel: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/text
    pub type_text: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/time
    pub type_time: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/url
    pub type_url: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input/week
    pub type_week: std::option::Option<String>,
    ///
    pub usemap: std::option::Option<String>,
    ///
    pub webkitdirectory: std::option::Option<String>,
}
