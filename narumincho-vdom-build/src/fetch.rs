use futures::StreamExt;
use futures::TryStreamExt;

#[derive(serde::Deserialize)]
struct UnpkgMeta {
    files: Vec<UnpkgFile>,
}

#[derive(serde::Deserialize)]
struct UnpkgFile {
    path: String,
}

pub async fn download() -> anyhow::Result<()> {
    tokio::try_join!(
        download_package_files(
            "@webref/elements",
            "2.7.1",
            ".json",
            std::path::Path::new("./narumincho-vdom-build/cache/webref-elements")
        ),
        download_package_files(
            "@webref/idl",
            "3.82.0",
            ".idl",
            std::path::Path::new("./narumincho-vdom-build/cache/webref-idl")
        ),
    )?;
    Ok(())
}

async fn download_package_files(
    package_name: &str,
    package_version: &str,
    extension: &str,
    dir: &std::path::Path,
) -> anyhow::Result<()> {
    if tokio::fs::try_exists(dir).await? {
        return Ok(());
    };
    tokio::fs::create_dir_all(dir).await?;

    futures::stream::iter(
        get_package_file_names(package_name, package_version)
            .await?
            .filter(|path| path.ends_with(extension) && path != "/package.json"),
    )
    .map(async |path| {
        println!("{}@{}/{} fetch start", package_name, package_version, path);

        let mut dest_file = tokio::fs::File::create(dir.join(&path)).await?;

        let file_content_stream =
            get_package_file_content(package_name, package_version, &path).await?;

        let mut reader = tokio_util::io::StreamReader::new(file_content_stream);

        tokio::io::copy(&mut reader, &mut dest_file).await?;
        println!(
            "{}@{}/{} write compoleted",
            package_name, package_version, path
        );
        Ok::<(), anyhow::Error>(())
    })
    .buffer_unordered(5) // 同時実行数を制限
    .try_for_each(|_| async { Ok(()) })
    .await?;

    Ok(())
}

async fn get_package_file_names(
    name: &str,
    version: &str,
) -> anyhow::Result<impl Iterator<Item = String>> {
    let url = format!("https://unpkg.com/{}@{}/?meta", name, version);
    let response = reqwest::get(&url).await?;
    let meta: UnpkgMeta = response.json().await?;

    let iterator = meta
        .files
        .into_iter()
        .map(|file| file.path.trim_start_matches('/').to_string());

    Ok(iterator)
}

async fn get_package_file_content(
    name: &str,
    version: &str,
    file_path: &str,
) -> anyhow::Result<impl futures::Stream<Item = Result<tokio_util::bytes::Bytes, std::io::Error>>> {
    Ok(reqwest::get(format!(
        "https://unpkg.com/{}@{}/{}",
        name, version, file_path
    ))
    .await?
    .bytes_stream()
    .map(|item| item.map_err(std::io::Error::other)))
}
