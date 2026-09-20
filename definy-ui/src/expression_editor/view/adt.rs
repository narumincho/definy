use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};
use crate::expression_editor::EditorTarget;

use super::super::types::{ExpressionEditorContext, ScopeVariable};
use super::render_expression_editor;

pub fn render_type_union(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    _target: EditorTarget,
    type_union: &definy_event::event::TypeUnionExpression,
) -> Element {
    let language = context.language;
    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%;",
            div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                "{language.label(\"Union Variants\", \"直和型のバリアント一覧\", \"Unionaj variantoj\")}"
            }
            div { style: "display: flex; flex-direction: column; gap: 0.25rem; width: 100%;",
                for (idx, variant) in type_union.variants.iter().enumerate() {
                    div {
                        key: "{idx}",
                        style: "display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem; background: var(--surface-secondary); border-radius: var(--radius-sm);",
                        span { style: "font-weight: 600; font-size: 0.85rem; color: var(--accent);",
                            "{variant.tag}"
                        }
                        if let Some(payload_type) = &variant.payload_type {
                            {
                                let mut var_path = path.to_vec();
                                var_path.push(PathStep::TypeUnionVariant(idx));
                                rsx! {
                                    div { style: "flex: 1;",
                                        {
                                            render_expression_editor(
                                                state,
                                                payload_type.as_ref(),
                                                context
                                                    .child(
                                                        var_path,
                                                        context.scope_variables.clone(),
                                                        context.structure_locked,
                                                        context.allow_kind_change,
                                                    ),
                                            )
                                        }
                                    }
                                }
                            }
                        } else {
                            span { style: "font-size: 0.75rem; color: var(--text-secondary);",
                                "(unit)"
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn render_variant(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    _target: EditorTarget,
    variant_expr: &definy_event::event::VariantExpression,
) -> Element {
    let language = context.language;
    let mut payload_path = path.to_vec();
    payload_path.push(PathStep::VariantPayload);

    rsx! {
        div { style: "display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; width: 100%;",
            span { style: "font-weight: 600; font-size: 0.85rem; padding: 0.15rem 0.4rem; background: var(--accent-subtle); color: var(--accent); border-radius: var(--radius-sm);",
                "{variant_expr.tag}"
            }
            if let Some(payload) = &variant_expr.payload {
                div { style: "display: flex; align-items: center; gap: 0.25rem; flex: 1;",
                    span { style: "color: var(--text-secondary);", "(" }
                    div { style: "flex: 1;",
                        {
                            render_expression_editor(
                                state,
                                payload.as_ref(),
                                context
                                    .child(
                                        payload_path,
                                        context.scope_variables.clone(),
                                        context.structure_locked,
                                        context.allow_kind_change,
                                    ),
                            )
                        }
                    }
                    span { style: "color: var(--text-secondary);", ")" }
                }
            } else {
                span { style: "font-size: 0.75rem; color: var(--text-secondary);",
                    "{language.label(\"Unit (no payload)\", \"ペイロードなし\", \"Sen utilŝarĝo\")}"
                }
            }
        }
    }
}

pub fn render_match(
    state: &AppState,
    context: &ExpressionEditorContext,
    path: &[PathStep],
    _target: EditorTarget,
    match_expr: &definy_event::event::MatchExpression,
) -> Element {
    let language = context.language;
    let mut target_path = path.to_vec();
    target_path.push(PathStep::MatchTarget);

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.4rem; width: 100%;",
            div { style: "display: flex; flex-direction: column; gap: 0.15rem; width: 100%;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Match Target\", \"分岐対象の式\", \"Celo de kongruo\")}"
                }
                {
                    render_expression_editor(
                        state,
                        match_expr.target.as_ref(),
                        context
                            .child(
                                target_path,
                                context.scope_variables.clone(),
                                context.structure_locked,
                                context.allow_kind_change,
                            ),
                    )
                }
            }
            div { style: "display: flex; flex-direction: column; gap: 0.35rem; width: 100%; border-left: 2px solid var(--accent); padding-left: 0.5rem;",
                div { style: "font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;",
                    "{language.label(\"Match Arms\", \"パターン分岐一覧\", \"Kongruaj branĉoj\")}"
                }
                for (idx, arm) in match_expr.arms.iter().enumerate() {
                    {
                        let mut arm_scope = context.scope_variables.clone();
                        if let (Some(var_id), Some(var_name)) = (arm.variable_id, &arm.variable_name) {
                            arm_scope.push(ScopeVariable::new(var_id, var_name.to_string()));
                        }
                        let mut arm_path = path.to_vec();
                        arm_path.push(PathStep::MatchArmBody(idx));
                        rsx! {
                            div {
                                key: "{idx}",
                                style: "display: flex; flex-direction: column; gap: 0.2rem; background: var(--surface-secondary); padding: 0.35rem; border-radius: var(--radius-sm); width: 100%;",
                                div { style: "display: flex; align-items: center; gap: 0.3rem;",
                                    span { style: "font-weight: 600; color: var(--accent);", "{arm.tag}" }
                                    if let Some(var_name) = &arm.variable_name {
                                        span { style: "font-size: 0.8rem; color: var(--text-secondary);", "({var_name})" }
                                    }
                                    span { style: "font-size: 0.8rem; color: var(--text-secondary);", "=>" }
                                }
                                div { style: "width: 100%;",
                                    {
                                        render_expression_editor(
                                            state,
                                            arm.body.as_ref(),
                                            context
                                                .child(
                                                    arm_path,
                                                    arm_scope,
                                                    context.structure_locked,
                                                    context.allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                if let Some(default_expr) = &match_expr.default {
                    {
                        let mut default_path = path.to_vec();
                        default_path.push(PathStep::MatchDefault);
                        rsx! {
                            div { style: "display: flex; flex-direction: column; gap: 0.2rem; background: var(--surface-secondary); padding: 0.35rem; border-radius: var(--radius-sm); width: 100%;",
                                div { style: "font-weight: 600; color: var(--text-secondary);", "_ =>" }
                                div { style: "width: 100%;",
                                    {
                                        render_expression_editor(
                                            state,
                                            default_expr.as_ref(),
                                            context
                                                .child(
                                                    default_path,
                                                    context.scope_variables.clone(),
                                                    context.structure_locked,
                                                    context.allow_kind_change,
                                                ),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
