use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;

use crate::AppState;
use crate::error::ApiError;

#[derive(Clone)]
pub struct Database(pub Surreal<Any>);

impl FromRequestParts<AppState> for Database {
    type Rejection = ApiError;

    async fn from_request_parts(
        _parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        if let Some(db) = crate::ensure_db(state).await {
            Ok(Self(db))
        } else if *state.db_init_status.read().await == crate::DbInitStatus::Initializing {
            Err(ApiError::DatabaseInitializing)
        } else {
            Err(ApiError::DatabaseUnavailable)
        }
    }
}
