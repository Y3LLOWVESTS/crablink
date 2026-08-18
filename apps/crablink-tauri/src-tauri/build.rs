fn main() {
    println!(
        "cargo:rerun-if-env-changed=CRABLINK_DESKTOP_AB_VARIANT"
    );

    if let Ok(value) =
        std::env::var("CRABLINK_DESKTOP_AB_VARIANT")
    {
        match value.as_str() {
            "a" | "b" => {}
            _ => {
                panic!(
                    "CRABLINK_DESKTOP_AB_VARIANT must be a or b"
                );
            }
        }
    }

    tauri_build::build();
}
