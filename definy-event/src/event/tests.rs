use super::*;

#[test]
fn test_part_type_display() {
    assert_eq!(PartType::Number.to_string(), "number");
    assert_eq!(PartType::String.to_string(), "string");
    assert_eq!(PartType::Boolean.to_string(), "boolean");
    assert_eq!(PartType::Type.to_string(), "type");
    assert_eq!(
        PartType::List(Box::new(PartType::Number)).to_string(),
        "list<number>"
    );
    assert_eq!(
        PartType::Function {
            parameters: vec![
                FunctionParameterType {
                    name: "list".into(),
                    r#type: Box::new(PartType::List(Box::new(PartType::String))),
                },
                FunctionParameterType {
                    name: "target".into(),
                    r#type: Box::new(PartType::String),
                },
                FunctionParameterType {
                    name: "index".into(),
                    r#type: Box::new(PartType::Number),
                },
            ],
            return_type: Box::new(PartType::Boolean),
        }
        .to_string(),
        "(list: list<string>, target: string, index: number) -> boolean"
    );
    let record_type = PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "age".into(),
            value: Box::new(PartType::Number),
        },
    ]);
    assert_eq!(record_type.to_string(), "{name: string, age: number}");

    let union_type = PartType::Union(vec![
        UnionVariantType {
            tag: "none".into(),
            payload: None,
        },
        UnionVariantType {
            tag: "some".into(),
            payload: Some(Box::new(PartType::Number)),
        },
    ]);
    assert_eq!(union_type.to_string(), "union<none | some(number)>");

    assert_eq!(PartType::optional_to_string(&None), "none");
    assert_eq!(
        PartType::optional_to_string(&Some(PartType::Number)),
        "number"
    );
}

#[test]
fn test_part_type_expression_roundtrip() {
    let types = vec![
        PartType::Number,
        PartType::String,
        PartType::Boolean,
        PartType::List(Box::new(PartType::Number)),
        PartType::Function {
            parameters: vec![FunctionParameterType {
                name: "arg".into(),
                r#type: Box::new(PartType::String),
            }],
            return_type: Box::new(PartType::Boolean),
        },
        PartType::Record(vec![
            RecordFieldType {
                key: "x".into(),
                value: Box::new(PartType::Number),
            },
            RecordFieldType {
                key: "y".into(),
                value: Box::new(PartType::String),
            },
        ]),
        PartType::Union(vec![
            UnionVariantType {
                tag: "none".into(),
                payload: None,
            },
            UnionVariantType {
                tag: "some".into(),
                payload: Some(Box::new(PartType::Number)),
            },
        ]),
    ];

    for pt in types {
        let expr = pt.to_expression();
        let recovered = PartType::from_expression(&expr).expect("should convert back");
        assert_eq!(pt, recovered);
    }
}
