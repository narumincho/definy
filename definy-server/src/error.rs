use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use utoipa::IntoResponses;

#[derive(Debug, IntoResponses)]
pub enum ApiError {
    #[response(status = 503, description = "Database is unavailable")]
    DatabaseUnavailable,
    #[response(status = 503, description = "Database is initializing")]
    DatabaseInitializing,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DatabaseUnavailable => write!(f, "Database is unavailable"),
            Self::DatabaseInitializing => write!(f, "Database is initializing"),
        }
    }
}

impl std::error::Error for ApiError {}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            Self::DatabaseUnavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                [("Content-Type", "application/json; charset=utf-8")],
                r#"{"code":"unavailable","message":"Database is unavailable"}"#,
            )
                .into_response(),
            Self::DatabaseInitializing => (
                StatusCode::SERVICE_UNAVAILABLE,
                [("Content-Type", "application/json; charset=utf-8")],
                r#"{"code":"unavailable","message":"Database is initializing"}"#,
            )
                .into_response(),
        }
    }
}
