# definy 汎用 WASI ランタイム (wasmtime runner)
# アプリケーションコードを含まない不変のベースイメージであるため、コード変更による再ビルドは一切不要です。
FROM alpine:3.20

# 実行に必要な最小限のライブラリとツールをインストール
RUN apk add --no-cache curl ca-certificates tar xz libgcc libstdc++

# wasmtime 公式リリースバイナリをインストール (x86_64 / aarch64 自動判別)
ARG WASMTIME_VERSION=v25.0.2
RUN ARCH=$(uname -m) && \
    case "$ARCH" in \
      x86_64) WASMTIME_ARCH="x86_64-linux" ;; \
      aarch64) WASMTIME_ARCH="aarch64-linux" ;; \
      *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
    esac && \
    curl -fsSL "https://github.com/bytecodealliance/wasmtime/releases/download/${WASMTIME_VERSION}/wasmtime-${WASMTIME_VERSION}-${WASMTIME_ARCH}.tar.xz" | tar -xJ --strip-components=1 -C /usr/local/bin "wasmtime-${WASMTIME_VERSION}-${WASMTIME_ARCH}/wasmtime" && \
    chmod +x /usr/local/bin/wasmtime

WORKDIR /app
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
