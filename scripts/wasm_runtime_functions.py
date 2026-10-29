"""definy 製コンパイラのランタイム関数 (seeds/core.json の core.wasm-runtime-functions) を組み立てる.

core.compile-to-wasm は evaluate 関数の後ろに, ここで組み立てた関数の本体のバイト列をそのまま出す.
関数の番号と型は core.compile-to-wasm / core.compile-expr-instructions と揃えること
(型セクション・関数セクションは core.compile-to-wasm の中の定数).
値の箱の形は docs/self-hosting.md の「値の表現 (線形メモリの形)」を参照.

    python3 scripts/wasm_runtime_functions.py seeds/core.json
    # コンパイラの出力が変わるので, 続けて npm run build:stage1 -- --bootstrap と npm run build:seeds を実行する
"""
import json
import sys

# ---------------- Wasm アセンブラ (Python 側, 定数のバイト列を作る) ----------------
def uleb(n):
    out = []
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return out


def sleb(n):
    out = []
    while True:
        b = n & 0x7F
        n >>= 7
        if (n == 0 and not (b & 0x40)) or (n == -1 and (b & 0x40)):
            out.append(b)
            return out
        out.append(b | 0x80)


I32, I64 = 0x7F, 0x7E
EMPTY = 0x40


class A:
    def __init__(self):
        self.b = []

    def op(self, *xs):
        self.b.extend(xs)
        return self

    def get(self, i): return self.op(0x20, *uleb(i))
    def set(self, i): return self.op(0x21, *uleb(i))
    def tee(self, i): return self.op(0x22, *uleb(i))
    def i32(self, n): return self.op(0x41, *sleb(n))
    def i64(self, n): return self.op(0x42, *sleb(n))
    def call(self, f): return self.op(0x10, *uleb(f))
    def load(self, off): return self.op(0x28, 2, *uleb(off))
    def load64(self, off): return self.op(0x29, 3, *uleb(off))
    def load_f64(self, off): return self.op(0x2B, 3, *uleb(off))
    def load8(self, off): return self.op(0x2D, 0, *uleb(off))
    def store(self, off): return self.op(0x36, 2, *uleb(off))
    def store64(self, off): return self.op(0x37, 3, *uleb(off))
    def store8(self, off): return self.op(0x3A, 0, *uleb(off))
    def if_(self, t=EMPTY): return self.op(0x04, t)
    def else_(self): return self.op(0x05)
    def end(self): return self.op(0x0B)
    def block(self): return self.op(0x02, EMPTY)
    def loop(self): return self.op(0x03, EMPTY)
    def br(self, n): return self.op(0x0C, n)
    def br_if(self, n): return self.op(0x0D, n)
    def ret(self): return self.op(0x0F)
    def copy(self): return self.op(0xFC, 0x0A, 0x00, 0x00)  # memory.copy


I32_EQZ, I32_EQ, I32_NE, I32_LT_U, I32_GT_U, I32_GE_U, I32_LE_U = 0x45, 0x46, 0x47, 0x49, 0x4B, 0x4F, 0x4D
I32_ADD, I32_SUB, I32_AND, I32_OR, I32_SHL, I32_SHR_U = 0x6A, 0x6B, 0x71, 0x72, 0x74, 0x76
I64_EQ, I64_LT_S, I64_GT_S, I64_GE_S = 0x51, 0x53, 0x55, 0x59
F64_EQ = 0x61
WRAP, EXTEND_U, SELECT, DROP, UNREACHABLE = 0xA7, 0xAD, 0x1B, 0x1A, 0x00

# 関数番号
F_EVALUATE, F_ALLOC, F_BOX_NUMBER, F_BOX_BOOL, F_STRING_EQ, F_VALUES_EQUAL, F_RECORD_GET = 0, 1, 2, 3, 4, 5, 6
F_LIST_CONCAT, F_LIST_APPEND, F_STRING_CONCAT, F_STRING_SLICE, F_STRING_TO_BYTES, F_LIST_GET = 7, 8, 9, 10, 11, 12
F_MATCH_TAG, F_MATCH_PAYLOAD = 13, 14
# core.compile-to-wasm が文字列の表の先頭に置く "true" "false" "none" "some" の箱の番地
TRUE_STRING, FALSE_STRING, NONE_STRING, SOME_STRING, HEAP_START = 1024, 1040, 1056, 1072, 1088

# 型: 0 ()->i32, 1 (i32)->i32, 2 (i64)->i32, 3 (i32,i32)->i32, 4 (i32,i32,i32)->i32
TYPES = [[], [I32], [I64], [I32, I32], [I32, I32, I32]]
type_section_payload = uleb(len(TYPES))
for params in TYPES:
    type_section_payload += [0x60] + uleb(len(params)) + params + [1, I32]

helpers = []  # (type index, locals [(count, type)], code)


def helper(type_index, locals_, a):
    helpers.append((type_index, locals_, a.end().b))


# 1 alloc(size) -> ptr. ヒープを 8 バイト境界に揃えて伸ばし, 足りなければ memory.grow する.
# 1 ページずつ伸ばすと伸ばすたびにメモリを写し直すことがあるので, 足りない分と今の大きさの大きい方だけ伸ばす (倍々にする)
a = A().op(0x23, 0).set(1)
a.op(0x23, 0).get(0).op(I32_ADD).i32(7).op(I32_ADD).i32(-8).op(I32_AND).op(0x24, 0)
a.op(0x23, 0).op(0x3F, 0).i32(16).op(I32_SHL).op(I32_GT_U).if_()
a.op(0x23, 0).i32(65535).op(I32_ADD).i32(16).op(I32_SHR_U).op(0x3F, 0).op(I32_SUB).set(2)
a.op(0x3F, 0).get(2).op(0x3F, 0).get(2).op(I32_GT_U).op(SELECT)
a.op(0x40, 0).i32(-1).op(I32_EQ).if_().op(UNREACHABLE).end()
a.end().get(1)
helper(1, [(2, I32)], a)
# 2 box_number(i64) -> ptr (タグ 0 は確保したばかりの 0 のまま)
helper(2, [(1, I32)], A().i32(16).call(F_ALLOC).tee(1).get(0).store64(8).get(1))
# 3 box_bool(i32) -> ptr
helper(1, [(1, I32)], A().i32(16).call(F_ALLOC).tee(1).i32(1).store8(0).get(1).get(0).store8(8).get(1))
# 4 string_eq(a, b) -> i32
a = A().get(0).get(1).op(I32_EQ).if_().i32(1).ret().end()
a.get(0).load(4).tee(3).get(1).load(4).op(I32_NE).if_().i32(0).ret().end()
a.i32(0).set(2).block().loop()
a.get(2).get(3).op(I32_GE_U).br_if(1)
a.get(0).get(2).op(I32_ADD).load8(8).get(1).get(2).op(I32_ADD).load8(8).op(I32_NE).if_().i32(0).ret().end()
a.get(2).i32(1).op(I32_ADD).set(2).br(0)
a.end().end().i32(1)
helper(3, [(2, I32)], a)
# 5 values_equal(a, b) -> i32. 中身で比べる (core.value-equals と同じ). リスト・レコード・バリアントは中まで辿り,
# レコードはフィールドの順番によらずキーで比べる. 関数 (クロージャ) は同じ箱のときだけ等しい.
# 浮動小数 (タグ 7) は IEEE 754 の比較 (f64.eq) なので, 同じ箱でも NaN は等しくない
a = A().get(0).load8(0).i32(7).op(I32_EQ).if_()
a.get(1).load8(0).i32(7).op(I32_EQ).if_().get(0).load_f64(8).get(1).load_f64(8).op(F64_EQ).ret().end()
a.i32(0).ret().end()
a.get(0).get(1).op(I32_EQ).if_().i32(1).ret().end()
a.get(0).load8(0).tee(2).get(1).load8(0).op(I32_NE).if_().i32(0).ret().end()
a.get(2).i32(2).op(I32_EQ).if_().get(0).get(1).call(F_STRING_EQ).ret().end()
a.get(2).op(I32_EQZ).if_().get(0).load64(8).get(1).load64(8).op(I64_EQ).ret().end()
a.get(2).i32(1).op(I32_EQ).if_().get(0).load8(8).get(1).load8(8).op(I32_EQ).ret().end()
# リスト: 長さが同じで, 要素が順に等しい
a.get(2).i32(3).op(I32_EQ).if_()
a.get(0).load(4).tee(3).get(1).load(4).op(I32_NE).if_().i32(0).ret().end()
a.i32(0).set(4).block().loop()
a.get(4).get(3).op(I32_GE_U).br_if(1)
a.get(0).get(4).i32(2).op(I32_SHL).op(I32_ADD).load(8)
a.get(1).get(4).i32(2).op(I32_SHL).op(I32_ADD).load(8)
a.call(F_VALUES_EQUAL).op(I32_EQZ).if_().i32(0).ret().end()
a.get(4).i32(1).op(I32_ADD).set(4).br(0)
a.end().end().i32(1).ret().end()
# レコード: フィールドの数が同じで, a の各フィールドが b に同じキーで等しい値としてある
a.get(2).i32(4).op(I32_EQ).if_()
a.get(0).load(4).tee(3).get(1).load(4).op(I32_NE).if_().i32(0).ret().end()
a.i32(0).set(4).block().loop()
a.get(4).get(3).op(I32_GE_U).br_if(1)
a.i32(0).set(5).block().loop()
a.get(5).get(3).op(I32_GE_U).if_().i32(0).ret().end()
a.get(1).get(5).i32(3).op(I32_SHL).op(I32_ADD).load(8)
a.get(0).get(4).i32(3).op(I32_SHL).op(I32_ADD).load(8).call(F_STRING_EQ).if_()
a.get(0).get(4).i32(3).op(I32_SHL).op(I32_ADD).load(12)
a.get(1).get(5).i32(3).op(I32_SHL).op(I32_ADD).load(12)
a.call(F_VALUES_EQUAL).op(I32_EQZ).if_().i32(0).ret().end()
a.br(2).end()
a.get(5).i32(1).op(I32_ADD).set(5).br(0)
a.end().end()
a.get(4).i32(1).op(I32_ADD).set(4).br(0)
a.end().end().i32(1).ret().end()
# バリアント: タグが同じで, ペイロードが両方無いか等しい
a.get(2).i32(6).op(I32_EQ).if_()
a.get(0).load(4).get(1).load(4).call(F_STRING_EQ).op(I32_EQZ).if_().i32(0).ret().end()
a.get(0).load(8).set(5).get(1).load(8).set(6)
a.get(5).get(6).op(I32_EQ).if_().i32(1).ret().end()
a.get(5).op(I32_EQZ).get(6).op(I32_EQZ).op(I32_OR).if_().i32(0).ret().end()
a.get(5).get(6).call(F_VALUES_EQUAL).ret().end()
a.i32(0)
helper(3, [(5, I32)], a)
# 6 record_get(record, key) -> value ptr. 無ければ unreachable
a = A().get(0).load(4).set(3).i32(0).set(2).block().loop()
a.get(2).get(3).op(I32_GE_U).br_if(1)
a.get(0).get(2).i32(3).op(I32_SHL).op(I32_ADD).load(8).get(1).call(F_STRING_EQ)
a.if_().get(0).get(2).i32(3).op(I32_SHL).op(I32_ADD).load(12).ret().end()
a.get(2).i32(1).op(I32_ADD).set(2).br(0)
a.end().end().op(UNREACHABLE)
helper(3, [(2, I32)], a)
# 7 list_concat(a, b) -> ptr
a = A().get(0).load(4).set(2).get(1).load(4).set(3)
a.get(2).get(3).op(I32_ADD).i32(2).op(I32_SHL).i32(8).op(I32_ADD).call(F_ALLOC).set(4)
a.get(4).i32(3).store8(0).get(4).get(2).get(3).op(I32_ADD).store(4)
a.get(4).i32(8).op(I32_ADD).get(0).i32(8).op(I32_ADD).get(2).i32(2).op(I32_SHL).copy()
a.get(4).i32(8).op(I32_ADD).get(2).i32(2).op(I32_SHL).op(I32_ADD).get(1).i32(8).op(I32_ADD).get(3).i32(2).op(I32_SHL).copy()
a.get(4)
helper(3, [(3, I32)], a)
# 8 list_append(list, item) -> ptr
a = A().get(0).load(4).set(2)
a.get(2).i32(1).op(I32_ADD).i32(2).op(I32_SHL).i32(8).op(I32_ADD).call(F_ALLOC).set(3)
a.get(3).i32(3).store8(0).get(3).get(2).i32(1).op(I32_ADD).store(4)
a.get(3).i32(8).op(I32_ADD).get(0).i32(8).op(I32_ADD).get(2).i32(2).op(I32_SHL).copy()
a.get(3).get(2).i32(2).op(I32_SHL).op(I32_ADD).get(1).store(8)
a.get(3)
helper(3, [(2, I32)], a)
# 9 string_concat(a, b) -> ptr
a = A().get(0).load(4).set(2).get(1).load(4).set(3)
a.get(2).get(3).op(I32_ADD).i32(8).op(I32_ADD).call(F_ALLOC).set(4)
a.get(4).i32(2).store8(0).get(4).get(2).get(3).op(I32_ADD).store(4)
a.get(4).i32(8).op(I32_ADD).get(0).i32(8).op(I32_ADD).get(2).copy()
a.get(4).i32(8).op(I32_ADD).get(2).op(I32_ADD).get(1).i32(8).op(I32_ADD).get(3).copy()
a.get(4)
helper(3, [(3, I32)], a)
# 10 string_slice(string, start, end) -> ptr. start / end を 0..=長さ に丸め, end < start なら空
def clamp(a, param, dest):
    a.get(param).load64(8).set(7)
    a.get(7).i64(0).op(I64_LT_S).if_(I32).i32(0).else_()
    a.get(7).get(3).op(EXTEND_U).op(I64_GT_S).if_(I32).get(3).else_().get(7).op(WRAP).end()
    a.end().set(dest)


a = A().get(0).load(4).set(3)
clamp(a, 1, 4)
clamp(a, 2, 5)
a.get(5).get(4).op(I32_LT_U).if_().get(4).set(5).end()
a.get(5).get(4).op(I32_SUB).i32(8).op(I32_ADD).call(F_ALLOC).set(6)
a.get(6).i32(2).store8(0).get(6).get(5).get(4).op(I32_SUB).store(4)
a.get(6).i32(8).op(I32_ADD).get(0).i32(8).op(I32_ADD).get(4).op(I32_ADD).get(5).get(4).op(I32_SUB).copy()
a.get(6)
helper(4, [(4, I32), (1, I64)], a)
# 11 string_to_bytes(string) -> list of numbers
a = A().get(0).load(4).set(1)
a.get(1).i32(2).op(I32_SHL).i32(8).op(I32_ADD).call(F_ALLOC).set(2)
a.get(2).i32(3).store8(0).get(2).get(1).store(4)
a.i32(0).set(3).block().loop()
a.get(3).get(1).op(I32_GE_U).br_if(1)
a.get(2).get(3).i32(2).op(I32_SHL).op(I32_ADD)
a.get(0).get(3).op(I32_ADD).load8(8).op(EXTEND_U).call(F_BOX_NUMBER).store(8)
a.get(3).i32(1).op(I32_ADD).set(3).br(0)
a.end().end().get(2)
helper(1, [(3, I32)], a)
# 12 list_get(list, index) -> option の箱. 範囲内なら some(要素), 範囲外 (負の添字を含む) なら none
a = A().get(1).load64(8).set(2)
a.i32(16).call(F_ALLOC).tee(3).i32(6).store8(0)
a.get(2).i64(0).op(I64_LT_S).get(2).get(0).load(4).op(EXTEND_U).op(I64_GE_S).op(I32_OR)
a.if_().get(3).i32(NONE_STRING).store(4)
a.else_().get(3).i32(SOME_STRING).store(4)
a.get(3).get(0).get(2).op(WRAP).i32(2).op(I32_SHL).op(I32_ADD).load(8).store(8).end()
a.get(3)
helper(3, [(1, I64), (1, I32)], a)
# 13 match_tag(value) -> tag string ptr. Bool は "true" / "false", 文字列はその文字列 (文字列リテラルの腕で分岐する)
a = A().get(0).load8(0).i32(1).op(I32_EQ).if_(I32)
a.i32(TRUE_STRING).i32(FALSE_STRING).get(0).load8(8).op(SELECT).else_()
a.get(0).load8(0).i32(2).op(I32_EQ).if_(I32).get(0).else_().get(0).load(4).end().end()
helper(1, [], a)
# 14 match_payload(value) -> payload ptr. Bool は 0
a = A().get(0).load8(0).i32(1).op(I32_EQ).if_(I32).i32(0).else_().get(0).load(8).end()
helper(1, [], a)

assert len(helpers) == 14
function_section_payload = uleb(1 + len(helpers)) + [0] + [t for t, _, _ in helpers]
helper_bodies = []
for _, locals_, code in helpers:
    body = uleb(len(locals_))
    for count, ty in locals_:
        body += uleb(count) + [ty]
    body += code
    helper_bodies += uleb(len(body)) + body


if __name__ == "__main__":
    path = sys.argv[1]
    seed = json.load(open(path))
    part = next(p for p in seed["parts"] if p["name"] == "wasm-runtime-functions")
    part["expression"] = {"#list": [{"#number": n} for n in helper_bodies]}
    open(path, "w").write(json.dumps(seed, ensure_ascii=False, indent=2))
    print(f"{len(helpers)} functions, {len(helper_bodies)} bytes")
