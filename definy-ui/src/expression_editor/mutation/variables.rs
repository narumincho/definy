pub fn next_local_variable_id(expression: &definy_event::event::Expression) -> i64 {
    fn max_local_variable_id(expression: &definy_event::event::Expression) -> i64 {
        match expression {
            definy_event::event::Expression::Number(_) => 0,
            definy_event::event::Expression::String(_) => 0,
            definy_event::event::Expression::TypeNumber => 0,
            definy_event::event::Expression::TypeString => 0,
            definy_event::event::Expression::TypeBoolean => 0,
            definy_event::event::Expression::Boolean(_) => 0,
            definy_event::event::Expression::PartReference(_) => 0,
            definy_event::event::Expression::TypeList(type_list_expression) => {
                max_local_variable_id(type_list_expression.item_type.as_ref())
            }
            definy_event::event::Expression::ListLiteral(list_expression) => list_expression
                .items
                .iter()
                .map(max_local_variable_id)
                .max()
                .unwrap_or(0),
            definy_event::event::Expression::TypeLiteral(record_expression) => record_expression
                .items
                .iter()
                .map(|item| max_local_variable_id(item.value.as_ref()))
                .max()
                .unwrap_or(0),
            definy_event::event::Expression::Add(add_expression) => {
                max_local_variable_id(add_expression.left.as_ref())
                    .max(max_local_variable_id(add_expression.right.as_ref()))
            }
            definy_event::event::Expression::Subtract(sub_expression) => {
                max_local_variable_id(sub_expression.left.as_ref())
                    .max(max_local_variable_id(sub_expression.right.as_ref()))
            }
            definy_event::event::Expression::Multiply(mul_expression) => {
                max_local_variable_id(mul_expression.left.as_ref())
                    .max(max_local_variable_id(mul_expression.right.as_ref()))
            }
            definy_event::event::Expression::Divide(div_expression) => {
                max_local_variable_id(div_expression.left.as_ref())
                    .max(max_local_variable_id(div_expression.right.as_ref()))
            }
            definy_event::event::Expression::Remainder(rem_expression) => {
                max_local_variable_id(rem_expression.left.as_ref())
                    .max(max_local_variable_id(rem_expression.right.as_ref()))
            }
            definy_event::event::Expression::Equal(equal_expression) => {
                max_local_variable_id(equal_expression.left.as_ref())
                    .max(max_local_variable_id(equal_expression.right.as_ref()))
            }
            definy_event::event::Expression::NotEqual(not_equal_expression) => {
                max_local_variable_id(not_equal_expression.left.as_ref())
                    .max(max_local_variable_id(not_equal_expression.right.as_ref()))
            }
            definy_event::event::Expression::LessThan(lt_expression) => {
                max_local_variable_id(lt_expression.left.as_ref())
                    .max(max_local_variable_id(lt_expression.right.as_ref()))
            }
            definy_event::event::Expression::LessThanOrEqual(le_expression) => {
                max_local_variable_id(le_expression.left.as_ref())
                    .max(max_local_variable_id(le_expression.right.as_ref()))
            }
            definy_event::event::Expression::GreaterThan(gt_expression) => {
                max_local_variable_id(gt_expression.left.as_ref())
                    .max(max_local_variable_id(gt_expression.right.as_ref()))
            }
            definy_event::event::Expression::GreaterThanOrEqual(ge_expression) => {
                max_local_variable_id(ge_expression.left.as_ref())
                    .max(max_local_variable_id(ge_expression.right.as_ref()))
            }
            definy_event::event::Expression::Not(not_expression) => {
                max_local_variable_id(not_expression.value.as_ref())
            }
            definy_event::event::Expression::And(and_expression) => {
                max_local_variable_id(and_expression.left.as_ref())
                    .max(max_local_variable_id(and_expression.right.as_ref()))
            }
            definy_event::event::Expression::Or(or_expression) => {
                max_local_variable_id(or_expression.left.as_ref())
                    .max(max_local_variable_id(or_expression.right.as_ref()))
            }
            definy_event::event::Expression::StringConcat(concat_expr) => {
                max_local_variable_id(concat_expr.left.as_ref())
                    .max(max_local_variable_id(concat_expr.right.as_ref()))
            }
            definy_event::event::Expression::StringLength(len_expr) => {
                max_local_variable_id(len_expr.value.as_ref())
            }
            definy_event::event::Expression::StringSlice(slice_expr) => {
                max_local_variable_id(slice_expr.value.as_ref())
                    .max(max_local_variable_id(slice_expr.start.as_ref()))
                    .max(max_local_variable_id(slice_expr.end.as_ref()))
            }
            definy_event::event::Expression::ListLength(len_expr) => {
                max_local_variable_id(len_expr.value.as_ref())
            }
            definy_event::event::Expression::ListConcat(concat_expr) => {
                max_local_variable_id(concat_expr.left.as_ref())
                    .max(max_local_variable_id(concat_expr.right.as_ref()))
            }
            definy_event::event::Expression::ListGet(get_expr) => {
                max_local_variable_id(get_expr.list.as_ref())
                    .max(max_local_variable_id(get_expr.index.as_ref()))
            }
            definy_event::event::Expression::ListAppend(append_expr) => {
                max_local_variable_id(append_expr.list.as_ref())
                    .max(max_local_variable_id(append_expr.item.as_ref()))
            }
            definy_event::event::Expression::If(if_expression) => {
                max_local_variable_id(if_expression.condition.as_ref())
                    .max(max_local_variable_id(if_expression.then_expr.as_ref()))
                    .max(max_local_variable_id(if_expression.else_expr.as_ref()))
            }
            definy_event::event::Expression::Let(let_expression) => let_expression
                .variable_id
                .max(max_local_variable_id(let_expression.value.as_ref()))
                .max(max_local_variable_id(let_expression.body.as_ref())),
            definy_event::event::Expression::Variable(var_expression) => var_expression.variable_id,
            definy_event::event::Expression::Constructor(constructor_expression) => {
                max_local_variable_id(constructor_expression.value.as_ref())
            }
            definy_event::event::Expression::Function(func_expression) => func_expression
                .parameter_id
                .max(max_local_variable_id(func_expression.body.as_ref())),
            definy_event::event::Expression::Call(call_expression) => {
                max_local_variable_id(call_expression.function.as_ref())
                    .max(max_local_variable_id(call_expression.argument.as_ref()))
            }
            definy_event::event::Expression::TypeFunction(type_func_expression) => {
                max_local_variable_id(type_func_expression.parameter.as_ref()).max(
                    max_local_variable_id(type_func_expression.return_type.as_ref()),
                )
            }
            definy_event::event::Expression::Compiler(_) => 0,
        }
    }
    max_local_variable_id(expression).saturating_add(1).max(1)
}
