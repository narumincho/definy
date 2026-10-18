pub mod deploy_detector;
pub mod expression_eval;
pub mod http_app;
pub mod self_hosted_ast;
#[cfg(not(target_arch = "wasm32"))]
pub mod self_hosted_compiler_module;
pub mod self_hosted_type_check;
pub mod wasm_emitter;

pub use deploy_detector::{DetectedDeploy, detect_deploy_in_expression};
pub use expression_eval::{Value, evaluate_expression, expression_to_source};

pub type DecodedEvent = Result<
    (ed25519_dalek::Signature, definy_event::event::Event),
    definy_event::VerifyAndDeserializeError,
>;
pub type EventWithHash = (definy_event::EventHashId, DecodedEvent);
