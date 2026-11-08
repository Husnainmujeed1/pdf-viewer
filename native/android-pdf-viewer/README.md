# Vendored AndroidPdfViewer 4.0.1 (patched)

Source of [zacharee/AndroidPdfViewer](https://github.com/zacharee/AndroidPdfViewer) at tag `4.0.1`,
the version `react-native-pdf` depends on. Apache License 2.0 (see `LICENSE`).

`plugins/withFastPdfViewer.js` excludes the Maven artifact and compiles this folder into the
`react-native-pdf` Gradle module instead.

## Changes (search for `PATCH (pdf-reader)`)

1. `PdfFile.java` reads page sizes with `FPDF_GetPageSizeByIndex` directly. The stock
   `PdfiumCore.getPageSize()` loads every page (and parses its content) just to read the size,
   which took over a minute for a 3,500-page book.
2. `PDFView.java` skips `load()` when the same document and configuration is already loading
   or loaded. `react-native-pdf` calls it 2-3 times when the viewer mounts.
3. `UriSource` / `FileSource` get a stable `toString()` used as the document identity for (2).
4. `scroll/DefaultScrollHandle.java` was removed (unused, and it needs the library's own resources).

If `react-native-pdf` changes its AndroidPdfViewer version, update this copy to match.
