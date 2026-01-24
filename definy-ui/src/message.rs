#[derive(Debug, PartialEq, Clone)]
pub enum Message {
    ShowCreateAccountDialog,
    CloseCreateAccountDialog,
    RegenerateKey,
    CopyPrivateKey,
    UpdateUsername(String),
    SubmitCreateAccountForm,
    ResponseCreateAccount,
}
