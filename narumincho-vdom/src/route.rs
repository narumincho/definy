pub trait Route: Sized {
    fn to_url(&self) -> String;
    fn from_url(url: &str) -> Option<Self>;
}

pub enum Href<L: Route> {
    External(String),
    Internal(L),
}

impl<L: Route> Into<String> for Href<L> {
    fn into(self) -> String {
        match self {
            Href::External(url) => url,
            Href::Internal(location) => location.to_url(),
        }
    }
}
