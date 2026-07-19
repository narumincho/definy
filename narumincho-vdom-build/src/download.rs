use futures::StreamExt;
use tokio::fs::File;
use tokio_util::io::StreamReader;

pub const CACHE_DIR: &str = "./narumincho-vdom-build/webref-elements";

#[derive(serde::Deserialize)]
struct UnpkgMeta {
    files: Vec<UnpkgFile>,
}

#[derive(serde::Deserialize)]
struct UnpkgFile {
    path: String,
}

pub async fn download() -> anyhow::Result<()> {
    let (html_result, web_idl_result) = tokio::join!(download_html_elements(), download_web_idl());
    html_result?;
    web_idl_result?;
    Ok(())
}

async fn download_html_elements() -> anyhow::Result<()> {
    let cache_dir = std::path::Path::new(CACHE_DIR);
    if tokio::fs::try_exists(cache_dir).await? {
        return Ok(());
    };
    tokio::fs::create_dir_all(cache_dir).await?;

    let meta_response = reqwest::get("https://unpkg.com/@webref/elements@2.7.1/?meta")
        .await?
        .json::<UnpkgMeta>()
        .await?;

    let targets: Vec<_> = meta_response
        .files
        .into_iter()
        .filter(|file| file.path.ends_with(".json") && file.path != "/package.json")
        .collect();

    let results = futures::stream::iter(targets)
        .map(|file| {
            let cache_dir_clone = cache_dir.to_path_buf();
            async move {
                let file_name = file.path.trim_start_matches('/');
                let file_url = format!("https://unpkg.com/@webref/elements{}", file.path);

                // 1. リクエストを送信し、レスポンスオブジェクトを得る (この時点では中身は未ダウンロード)
                let response = reqwest::get(&file_url).await?;

                // 2. 保存先のファイルを非同期で作成
                let mut dest_file =
                    tokio::fs::File::create(cache_dir_clone.join(file_name)).await?;

                // 3. レスポンスをバイトストリームとして取得
                let byte_stream = response.bytes_stream();

                // 4. reqwestのストリームを、TokioのAsyncRead（読み込み用トレイト）に変換する
                //    ※エラー型の変換が必要なため、一度 map_err を挟みます
                let io_error_stream = byte_stream.map(|item| {
                    item.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
                });
                let mut reader = tokio_util::io::StreamReader::new(io_error_stream);

                // 5. 読み込みストリームからファイルへ、メモリを節約しながら直接コピー
                tokio::io::copy(&mut reader, &mut dest_file).await?;

                Ok::<(), anyhow::Error>(())
            }
        })
        .buffer_unordered(5) // 同時実行数を制限
        .collect::<Vec<_>>()
        .await;

    // エラーチェック
    for res in results {
        res?;
    }
    Ok(())
}

async fn download_web_idl() -> anyhow::Result<()> {
    Ok(())
}
