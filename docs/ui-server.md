# UIサーバー SaaS どれにしようか問題

## 1. Deno Deploy

### 利点

- 1番使い慣れた言語のTypeScript+Denoで作成できる
- 自動スケール
- 環境依存が少ない. セルフホストに移行しやすい
- CDN でのキャッシュがサポートされている

### 欠点

- 作った環境を削除できないこと

## 2. Cloudflare Workers

### 利点

- ダウンロード料金が安い

### 欠点

- Deno ではない
- 環境依存が若干強い

# 結論

Deno Deploy, たくさん使われるようになったら Cloudflare Workers?
