// このファイルは narumincho-vdom-build によって自動生成されました。
pub mod optgroup;
pub mod wbr;
pub mod figure;
pub mod form;
pub mod hr;
pub mod colgroup;
pub mod aside;
pub mod tbody;
pub mod li;
pub mod iframe;
pub mod bdi;
pub mod meta;
pub mod font;
pub mod nobr;
pub mod button;
pub mod b;
pub mod img;
pub mod data;
pub mod slot;
pub mod br;
pub mod progress;
pub mod thead;
pub mod ul;
pub mod blockquote;
pub mod rt;
pub mod ins;
pub mod script;
pub mod bdo;
pub mod mark;
pub mod col;
pub mod strong;
pub mod object;
pub mod small;
pub mod area;
pub mod address;
pub mod style;
pub mod frameset;
pub mod dfn;
pub mod div;
pub mod strike;
pub mod caption;
pub mod samp;
pub mod del;
pub mod footer;
pub mod rp;
pub mod noscript;
pub mod dl;
pub mod time;
pub mod audio;
pub mod section;
pub mod sub;
pub mod code;
pub mod acronym;
pub mod h2;
pub mod select;
pub mod th;
pub mod noframes;
pub mod input;
pub mod param;
pub mod output;
pub mod head;
pub mod html;
pub mod abbr;
pub mod big;
pub mod selectedcontent;
pub mod fieldset;
pub mod td;
pub mod title;
pub mod rb;
pub mod h5;
pub mod search;
pub mod header;
pub mod body;
pub mod source;
pub mod datalist;
pub mod h6;
pub mod geolocation;
pub mod h1;
pub mod a;
pub mod kbd;
pub mod tfoot;
pub mod var;
pub mod fencedframe;
pub mod embed;
pub mod hgroup;
pub mod link;
pub mod menu;
pub mod em;
pub mod h3;
pub mod dd;
pub mod track;
pub mod textarea;
pub mod figcaption;
pub mod q;
pub mod span;
pub mod base;
pub mod label;
pub mod tr;
pub mod canvas;
pub mod details;
pub mod dt;
pub mod nav;
pub mod ol;
pub mod ruby;
pub mod p;
pub mod table;
pub mod rtc;
pub mod u;
pub mod picture;
pub mod sup;
pub mod marquee;
pub mod tt;
pub mod dialog;
pub mod s;
pub mod option;
pub mod h4;
pub mod pre;
pub mod summary;
pub mod i;
pub mod map;
pub mod plaintext;
pub mod template;
pub mod center;
pub mod noembed;
pub mod video;
pub mod dir;
pub mod xmp;
pub mod cite;
pub mod frame;
pub mod article;
pub mod legend;
pub mod main;
pub mod meter;

pub struct Element {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/nonce
    pub nonce: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autofocus
    pub autofocus: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/exportparts
    pub exportparts: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/class
    pub class: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/is
    pub is: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/inputmode
    pub inputmode: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/style
    pub style: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/tabindex
    pub tabindex: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/dir
    pub dir: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/inert
    pub inert: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/writingsuggestions
    pub writingsuggestions: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/title
    pub title: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/contenteditable
    pub contenteditable: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/enterkeyhint
    pub enterkeyhint: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/slot
    pub slot: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/data-*
    pub data_attributes: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/draggable
    pub draggable: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/hidden
    pub hidden: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/lang
    pub lang: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/part
    pub part: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/spellcheck
    pub spellcheck: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/popover
    pub popover: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autocapitalize
    pub autocapitalize: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autocorrect
    pub autocorrect: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/anchor
    pub anchor: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/id
    pub id: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/translate
    pub translate: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/virtualkeyboardpolicy
    pub virtualkeyboardpolicy: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/accesskey
    pub accesskey: std::option::Option<String>,
}

impl Element {
    pub fn new() -> Self {
        Self {
            nonce: None,
            autofocus: None,
            exportparts: None,
            class: None,
            is: None,
            inputmode: None,
            style: None,
            tabindex: None,
            dir: None,
            inert: None,
            writingsuggestions: None,
            title: None,
            contenteditable: None,
            enterkeyhint: None,
            slot: None,
            data_attributes: None,
            draggable: None,
            hidden: None,
            lang: None,
            part: None,
            spellcheck: None,
            popover: None,
            autocapitalize: None,
            autocorrect: None,
            anchor: None,
            id: None,
            translate: None,
            virtualkeyboardpolicy: None,
            accesskey: None,
        }
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/nonce
    pub fn nonce(mut self, value: impl Into<String>) -> Self {
        self.nonce = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autofocus
    pub fn autofocus(mut self, value: impl Into<String>) -> Self {
        self.autofocus = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/exportparts
    pub fn exportparts(mut self, value: impl Into<String>) -> Self {
        self.exportparts = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/class
    pub fn class(mut self, value: impl Into<String>) -> Self {
        self.class = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/is
    pub fn is(mut self, value: impl Into<String>) -> Self {
        self.is = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/inputmode
    pub fn inputmode(mut self, value: impl Into<String>) -> Self {
        self.inputmode = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/style
    pub fn style(mut self, value: impl Into<String>) -> Self {
        self.style = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/tabindex
    pub fn tabindex(mut self, value: impl Into<String>) -> Self {
        self.tabindex = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/dir
    pub fn dir(mut self, value: impl Into<String>) -> Self {
        self.dir = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/inert
    pub fn inert(mut self, value: impl Into<String>) -> Self {
        self.inert = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/writingsuggestions
    pub fn writingsuggestions(mut self, value: impl Into<String>) -> Self {
        self.writingsuggestions = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/title
    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.title = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/contenteditable
    pub fn contenteditable(mut self, value: impl Into<String>) -> Self {
        self.contenteditable = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/enterkeyhint
    pub fn enterkeyhint(mut self, value: impl Into<String>) -> Self {
        self.enterkeyhint = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/slot
    pub fn slot(mut self, value: impl Into<String>) -> Self {
        self.slot = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/data-*
    pub fn data_attributes(mut self, value: impl Into<String>) -> Self {
        self.data_attributes = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/draggable
    pub fn draggable(mut self, value: impl Into<String>) -> Self {
        self.draggable = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/hidden
    pub fn hidden(mut self, value: impl Into<String>) -> Self {
        self.hidden = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/lang
    pub fn lang(mut self, value: impl Into<String>) -> Self {
        self.lang = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/part
    pub fn part(mut self, value: impl Into<String>) -> Self {
        self.part = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/spellcheck
    pub fn spellcheck(mut self, value: impl Into<String>) -> Self {
        self.spellcheck = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/popover
    pub fn popover(mut self, value: impl Into<String>) -> Self {
        self.popover = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autocapitalize
    pub fn autocapitalize(mut self, value: impl Into<String>) -> Self {
        self.autocapitalize = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autocorrect
    pub fn autocorrect(mut self, value: impl Into<String>) -> Self {
        self.autocorrect = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/anchor
    pub fn anchor(mut self, value: impl Into<String>) -> Self {
        self.anchor = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/id
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/translate
    pub fn translate(mut self, value: impl Into<String>) -> Self {
        self.translate = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/virtualkeyboardpolicy
    pub fn virtualkeyboardpolicy(mut self, value: impl Into<String>) -> Self {
        self.virtualkeyboardpolicy = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/accesskey
    pub fn accesskey(mut self, value: impl Into<String>) -> Self {
        self.accesskey = Some(value.into());
        self
    }

}
